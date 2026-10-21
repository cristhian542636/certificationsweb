-- Varias certificaciones, accesos por certificación, garantía, referidos, límite de dispositivos y métricas del negocio.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run (primero en datacert-nonprod y, antes de pasar a main, en producción).

-- ─────────────────────────────────────────────────────────────
-- Accesos: qué certificación tiene cada alumno y hasta cuándo.
-- certificacion = id del catálogo (src/config/certificaciones.ts) o '*' para todas.
-- ─────────────────────────────────────────────────────────────
create table public.accesos (
  usuario_id     uuid not null references public.perfiles (id) on delete cascade,
  certificacion  text not null,
  vence_en       timestamptz not null,
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, certificacion)
);

alter table public.accesos enable row level security;
create policy "ver mis accesos" on public.accesos for select to authenticated using ((select auth.uid()) = usuario_id);
revoke insert, update, delete on public.accesos from anon, authenticated;

-- El premium de antes pasa a ser acceso a la única certificación publicada hasta ahora.
insert into public.accesos (usuario_id, certificacion, vence_en)
select id, 'dbx-de-associate', premium_hasta from public.perfiles where premium_hasta is not null
on conflict do nothing;

comment on column public.perfiles.premium_hasta is 'Obsoleta desde 0004: el acceso vive en public.accesos.';

-- Suma (o resta, con días negativos) tiempo de acceso. Comprar con un acceso vigente suma desde su vencimiento.
create function public.extender_acceso(p_usuario uuid, p_certificacion text, p_dias int)
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  v_vence timestamptz;
begin
  insert into public.accesos as a (usuario_id, certificacion, vence_en)
  values (p_usuario, p_certificacion, now() + make_interval(days => p_dias))
  on conflict (usuario_id, certificacion) do update
    set vence_en = case when p_dias >= 0
                        then greatest(a.vence_en, now()) + make_interval(days => p_dias)
                        else a.vence_en + make_interval(days => p_dias) end,
        actualizado_en = now()
  returning vence_en into v_vence;
  return v_vence;
end;
$$;

revoke execute on function public.extender_acceso from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Intentos y respuestas por certificación (todas las anteriores son de Data Engineer Associate).
-- ─────────────────────────────────────────────────────────────
alter table public.intentos   add column certificacion text not null default 'dbx-de-associate';
alter table public.respuestas add column certificacion text not null default 'dbx-de-associate';

-- ─────────────────────────────────────────────────────────────
-- Referidos: cada alumno tiene un código para invitar.
-- ─────────────────────────────────────────────────────────────
alter table public.perfiles add column codigo_referido text unique default substr(md5(gen_random_uuid()::text), 1, 8);

create table public.referidos (
  referido_id     uuid primary key references public.perfiles (id) on delete cascade,
  invitador_id    uuid not null references public.perfiles (id) on delete cascade,
  creado_en       timestamptz not null default now(),
  recompensado_en timestamptz,
  pago_id         bigint references public.pagos (id) on delete set null,
  check (referido_id <> invitador_id)
);

create index referidos_invitador_idx on public.referidos (invitador_id);

alter table public.referidos enable row level security;
create policy "ver mis referidos" on public.referidos for select to authenticated
  using ((select auth.uid()) in (referido_id, invitador_id));
revoke insert, update, delete on public.referidos from anon, authenticated;

-- Vincula al alumno nuevo con quien lo invitó (solo en su primera semana y si aún no compró).
create function public.aplicar_referido(p_codigo text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_usuario   uuid := auth.uid();
  v_invitador uuid;
begin
  if v_usuario is null or p_codigo is null then return false; end if;
  select id into v_invitador from public.perfiles where codigo_referido = lower(trim(p_codigo));
  if v_invitador is null or v_invitador = v_usuario then return false; end if;
  if not exists (select 1 from public.perfiles where id = v_usuario and creado_en > now() - interval '7 days') then return false; end if;
  if exists (select 1 from public.pagos where usuario_id = v_usuario and estado = 'approved') then return false; end if;

  insert into public.referidos (referido_id, invitador_id) values (v_usuario, v_invitador) on conflict do nothing;
  return found;
end;
$$;

revoke execute on function public.aplicar_referido from public, anon;
grant execute on function public.aplicar_referido to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Pagos: ahora otorgan días de acceso a una certificación (o a todas).
-- ─────────────────────────────────────────────────────────────
alter table public.pagos
  add column certificacion text,
  add column dias_acceso int,
  alter column meses_acceso drop not null;

drop function public.registrar_pago(uuid, text, text, numeric, text, text, text, text, int);

-- Registra o actualiza un pago y, si quedó aprobado, otorga el acceso UNA sola vez (idempotente).
-- Si es la primera compra de un alumno invitado, también premia a quien lo invitó.
create function public.registrar_pago(
  p_usuario_id        uuid,
  p_proveedor_pago_id text,
  p_producto          text,
  p_monto             numeric,
  p_moneda            text,
  p_metodo            text,
  p_estado            text,
  p_estado_detalle    text,
  p_certificacion     text,
  p_dias              int,
  p_dias_invitador    int default 0
)
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  v_pago      bigint;
  v_otorgado  boolean;
  v_invitador uuid;
begin
  insert into public.pagos as p (
    usuario_id, proveedor_pago_id, producto, monto, moneda, metodo, estado, estado_detalle, certificacion, dias_acceso
  )
  values (
    p_usuario_id, p_proveedor_pago_id, p_producto, p_monto, p_moneda, p_metodo, p_estado, p_estado_detalle, p_certificacion, p_dias
  )
  on conflict (proveedor, proveedor_pago_id) do update
    set estado = excluded.estado,
        estado_detalle = excluded.estado_detalle,
        metodo = coalesce(excluded.metodo, p.metodo),
        actualizado_en = now()
  returning id, acceso_otorgado into v_pago, v_otorgado;

  if p_estado = 'approved' and not v_otorgado then
    perform public.extender_acceso(p_usuario_id, p_certificacion, p_dias);
    update public.pagos set acceso_otorgado = true where id = v_pago;

    -- Recompensa al invitador en la primera compra del invitado.
    update public.referidos
       set recompensado_en = now(), pago_id = v_pago
     where referido_id = p_usuario_id and recompensado_en is null and p_dias_invitador > 0
    returning invitador_id into v_invitador;
    if v_invitador is not null then
      perform public.extender_acceso(v_invitador, p_certificacion, p_dias_invitador);
    end if;
  end if;

  -- Si el pago fue devuelto o anulado después de otorgar el acceso, se revoca (también la recompensa).
  if p_estado in ('refunded', 'charged_back', 'cancelled') and v_otorgado then
    perform public.extender_acceso(p_usuario_id, p_certificacion, -p_dias);
    update public.pagos set acceso_otorgado = false where id = v_pago;

    update public.referidos
       set recompensado_en = null, pago_id = null
     where pago_id = v_pago
    returning invitador_id into v_invitador;
    if v_invitador is not null and p_dias_invitador > 0 then
      perform public.extender_acceso(v_invitador, p_certificacion, -p_dias_invitador);
    end if;
  end if;

  return (select vence_en from public.accesos where usuario_id = p_usuario_id and certificacion = p_certificacion);
end;
$$;

revoke execute on function public.registrar_pago from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Garantía de acompañamiento: si no aprobaste, extendemos tu acceso una vez por certificación.
-- ─────────────────────────────────────────────────────────────
create table public.garantias (
  id            bigint generated always as identity primary key,
  usuario_id    uuid not null references public.perfiles (id) on delete cascade,
  certificacion text not null,
  fecha_examen  date not null,
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  nota          text,
  creado_en     timestamptz not null default now(),
  resuelto_en   timestamptz,
  unique (usuario_id, certificacion)
);

alter table public.garantias enable row level security;
create policy "ver mis garantias" on public.garantias for select to authenticated using ((select auth.uid()) = usuario_id);
revoke insert, update, delete on public.garantias from anon, authenticated;

-- Valida las condiciones y registra la solicitud. Devuelve 'ok' o el motivo por el que no aplica.
create function public.solicitar_garantia(p_certificacion text, p_minimo_simulacros int default 2, p_plazo_dias int default 15)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_perfil  record;
  v_hoy     date := (now() at time zone 'America/Lima')::date;
begin
  if v_usuario is null then return 'sin_sesion'; end if;
  select resultado_examen, fecha_examen into v_perfil from public.perfiles where id = v_usuario;

  if v_perfil.resultado_examen is distinct from 'no_aprobado' or v_perfil.fecha_examen is null then return 'sin_resultado'; end if;
  if v_hoy - v_perfil.fecha_examen > p_plazo_dias or v_perfil.fecha_examen > v_hoy then return 'fuera_de_plazo'; end if;
  if exists (select 1 from public.garantias where usuario_id = v_usuario and certificacion = p_certificacion) then return 'ya_solicitada'; end if;
  if not exists (
    select 1 from public.pagos
     where usuario_id = v_usuario and estado = 'approved' and acceso_otorgado
       and coalesce(certificacion, p_certificacion) in (p_certificacion, '*')
  ) then return 'sin_pase'; end if;
  if (select count(*) from public.intentos
       where usuario_id = v_usuario and certificacion = p_certificacion and modo = 'examen' and total >= 45
         and (creado_en at time zone 'America/Lima')::date <= v_perfil.fecha_examen) < p_minimo_simulacros
  then return 'pocos_simulacros'; end if;

  insert into public.garantias (usuario_id, certificacion, fecha_examen) values (v_usuario, p_certificacion, v_perfil.fecha_examen);
  return 'ok';
end;
$$;

revoke execute on function public.solicitar_garantia from public, anon;
grant execute on function public.solicitar_garantia to authenticated;

-- El administrador aprueba (y se extiende el acceso) o rechaza la solicitud.
create function public.resolver_garantia(p_id bigint, p_aprobar boolean, p_dias int, p_nota text default null)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_g public.garantias;
begin
  update public.garantias
     set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
         nota = p_nota,
         resuelto_en = now()
   where id = p_id and estado = 'pendiente'
  returning * into v_g;
  if v_g.id is null then return 'no_pendiente'; end if;
  if p_aprobar then
    perform public.extender_acceso(v_g.usuario_id, v_g.certificacion, p_dias);
  end if;
  return v_g.estado;
end;
$$;

revoke execute on function public.resolver_garantia from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Dispositivos: una cuenta puede estar activa en pocos dispositivos a la vez.
-- ─────────────────────────────────────────────────────────────
create table public.dispositivos (
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  dispositivo text not null,
  sesion      text,
  agente      text,
  ciudad      text,
  pais        text,
  revocado    boolean not null default false,
  creado_en   timestamptz not null default now(),
  ultimo_uso  timestamptz not null default now(),
  primary key (usuario_id, dispositivo)
);

alter table public.dispositivos enable row level security;
create policy "ver mis dispositivos" on public.dispositivos for select to authenticated using ((select auth.uid()) = usuario_id);
revoke insert, update, delete on public.dispositivos from anon, authenticated;

-- Registra el uso de un dispositivo. Un inicio de sesión nuevo lo reactiva y, si se pasa del máximo,
-- desactiva el usado hace más tiempo. Devuelve 'revocado' si este dispositivo debe cerrar sesión.
create function public.registrar_dispositivo(
  p_dispositivo text, p_agente text, p_ciudad text, p_pais text, p_maximo int default 2
)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_sesion  text := auth.jwt() ->> 'session_id';
  v_actual  public.dispositivos;
begin
  if v_usuario is null or p_dispositivo is null then return 'sin_sesion'; end if;

  select * into v_actual from public.dispositivos where usuario_id = v_usuario and dispositivo = p_dispositivo for update;
  if v_actual.usuario_id is not null and v_actual.revocado and v_actual.sesion is not distinct from v_sesion then
    return 'revocado';
  end if;

  insert into public.dispositivos as d (usuario_id, dispositivo, sesion, agente, ciudad, pais)
  values (v_usuario, p_dispositivo, v_sesion, left(p_agente, 300), left(p_ciudad, 80), left(p_pais, 8))
  on conflict (usuario_id, dispositivo) do update
    set sesion = excluded.sesion, revocado = false, ultimo_uso = now(),
        agente = excluded.agente, ciudad = coalesce(excluded.ciudad, d.ciudad), pais = coalesce(excluded.pais, d.pais);

  update public.dispositivos
     set revocado = true
   where usuario_id = v_usuario
     and dispositivo in (
       select dispositivo from public.dispositivos
        where usuario_id = v_usuario and not revocado
        order by ultimo_uso desc
       offset greatest(p_maximo, 1)
     );
  return 'ok';
end;
$$;

revoke execute on function public.registrar_dispositivo from public, anon;
grant execute on function public.registrar_dispositivo to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Uso diario: límite de preguntas servidas por día para evitar descargas masivas del banco.
-- ─────────────────────────────────────────────────────────────
create table public.uso_diario (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  dia        date not null,
  preguntas  int not null default 0,
  primary key (usuario_id, dia)
);

alter table public.uso_diario enable row level security;
revoke insert, update, delete on public.uso_diario from anon, authenticated;

-- Suma las preguntas entregadas hoy (hora de Lima) y devuelve el total del día.
create function public.contar_preguntas(p_cantidad int)
returns int
language plpgsql
security definer set search_path = ''
as $$
declare
  v_total int;
begin
  if auth.uid() is null then return 0; end if;
  insert into public.uso_diario as u (usuario_id, dia, preguntas)
  values (auth.uid(), (now() at time zone 'America/Lima')::date, greatest(p_cantidad, 0))
  on conflict (usuario_id, dia) do update set preguntas = u.preguntas + excluded.preguntas
  returning preguntas into v_total;
  return v_total;
end;
$$;

revoke execute on function public.contar_preguntas from public, anon;
grant execute on function public.contar_preguntas to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Métricas del negocio para /admin (solo service role).
-- ─────────────────────────────────────────────────────────────
create function public.admin_metricas()
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  with
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  mes as (select date_trunc('month', now() at time zone 'America/Lima') as ini),
  aprobados as (
    select p.*, (p.creado_en at time zone 'America/Lima') as local from public.pagos p where p.estado = 'approved'
  ),
  cohorte as (select id, nivel from public.perfiles where creado_en > now() - interval '30 days')
  select jsonb_build_object(
    'usuarios', (select count(*) from public.perfiles),
    'usuarios_7d', (select count(*) from public.perfiles where creado_en > now() - interval '7 days'),
    'activos_hoy', (select count(distinct usuario_id) from public.respuestas
                     where (creado_en at time zone 'America/Lima')::date = (select d from hoy)),
    'activos_7d', (select count(distinct usuario_id) from public.respuestas where creado_en > now() - interval '7 days'),
    'con_acceso', (select count(distinct usuario_id) from public.accesos where vence_en > now()),
    'pagantes', (select count(distinct usuario_id) from aprobados),
    'ventas_mes', (select count(*) from aprobados where local >= (select ini from mes)),
    'ingresos_mes', (select coalesce(sum(monto), 0) from aprobados where local >= (select ini from mes)),
    'ingresos_mes_anterior', (select coalesce(sum(monto), 0) from aprobados
                               where local >= (select ini from mes) - interval '1 month' and local < (select ini from mes)),
    'ingresos_total', (select coalesce(sum(monto), 0) from aprobados),
    'reembolsos_30d', (select count(*) from public.pagos
                        where estado in ('refunded', 'charged_back') and actualizado_en > now() - interval '30 days'),
    'embudo_30d', jsonb_build_object(
      'registrados', (select count(*) from cohorte),
      'con_meta', (select count(*) from cohorte where nivel is not null),
      'diagnostico', (select count(*) from cohorte c
                       where exists (select 1 from public.intentos i where i.usuario_id = c.id and i.modo = 'diagnostico')),
      'compraron', (select count(*) from cohorte c where exists (select 1 from aprobados a where a.usuario_id = c.id))
    ),
    'ventas_por_pase', coalesce((
      select jsonb_agg(jsonb_build_object('producto', producto, 'ventas', n, 'ingresos', total) order by total desc)
        from (select producto, count(*) n, sum(monto) total from aprobados group by producto) v
    ), '[]'::jsonb),
    'serie_30d', coalesce((
      select jsonb_agg(jsonb_build_object('dia', d.dia, 'registros', d.registros, 'ventas', d.ventas, 'ingresos', d.ingresos) order by d.dia)
        from (
          select g::date as dia,
                 (select count(*) from public.perfiles where (creado_en at time zone 'America/Lima')::date = g::date) as registros,
                 (select count(*) from aprobados where local::date = g::date) as ventas,
                 (select coalesce(sum(monto), 0) from aprobados where local::date = g::date) as ingresos
            from generate_series((select d from hoy) - 29, (select d from hoy), interval '1 day') g
        ) d
    ), '[]'::jsonb),
    'pagos_por_revisar', coalesce((
      select jsonb_agg(jsonb_build_object('email', pf.email, 'monto', p.monto, 'estado', p.estado, 'detalle', p.estado_detalle,
                                          'metodo', p.metodo, 'creado_en', p.creado_en) order by p.creado_en desc)
        from (select * from public.pagos
               where estado not in ('approved', 'refunded', 'charged_back', 'cancelled', 'rejected')
                  or (estado = 'rejected' and creado_en > now() - interval '7 days')
               order by creado_en desc limit 20) p
        join public.perfiles pf on pf.id = p.usuario_id
    ), '[]'::jsonb),
    'vencen_7d', coalesce((
      select jsonb_agg(jsonb_build_object('email', pf.email, 'nombre', pf.nombre, 'certificacion', a.certificacion, 'vence_en', a.vence_en) order by a.vence_en)
        from public.accesos a join public.perfiles pf on pf.id = a.usuario_id
       where a.vence_en between now() and now() + interval '7 days'
    ), '[]'::jsonb),
    'examenes_proximos', coalesce((
      select jsonb_agg(jsonb_build_object('email', email, 'nombre', nombre, 'fecha_examen', fecha_examen,
                                          'acceso', exists (select 1 from public.accesos a where a.usuario_id = pf.id and a.vence_en > now()))
                       order by fecha_examen)
        from public.perfiles pf
       where fecha_examen between (select d from hoy) and (select d from hoy) + 14 and resultado_examen is null
    ), '[]'::jsonb),
    'resultados', jsonb_build_object(
      'aprobados', (select count(*) from public.perfiles where resultado_examen = 'aprobado'),
      'no_aprobados', (select count(*) from public.perfiles where resultado_examen = 'no_aprobado')
    ),
    'garantias_pendientes', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'email', pf.email, 'nombre', pf.nombre, 'certificacion', g.certificacion,
                                          'fecha_examen', g.fecha_examen, 'creado_en', g.creado_en) order by g.creado_en)
        from public.garantias g join public.perfiles pf on pf.id = g.usuario_id
       where g.estado = 'pendiente'
    ), '[]'::jsonb),
    'alertas_dispositivos', coalesce((
      select jsonb_agg(jsonb_build_object('email', pf.email, 'dispositivos', x.dispositivos, 'ciudades', x.ciudades, 'revocados', x.revocados)
                       order by x.dispositivos desc)
        from (
          select usuario_id,
                 count(*) as dispositivos,
                 count(distinct ciudad) as ciudades,
                 count(*) filter (where revocado) as revocados
            from public.dispositivos
           where ultimo_uso > now() - interval '30 days'
           group by usuario_id
          having count(*) >= 4 or count(distinct ciudad) >= 3
        ) x join public.perfiles pf on pf.id = x.usuario_id
    ), '[]'::jsonb),
    'uso_alto', coalesce((
      select jsonb_agg(jsonb_build_object('email', pf.email, 'dia', u.dia, 'preguntas', u.preguntas) order by u.preguntas desc)
        from (select * from public.uso_diario where dia > (select d from hoy) - 7 and preguntas >= 200 order by preguntas desc limit 10) u
        join public.perfiles pf on pf.id = u.usuario_id
    ), '[]'::jsonb),
    'preguntas_dificiles', coalesce((
      select jsonb_agg(jsonb_build_object('pregunta_id', pregunta_id, 'dominio', dominio, 'respuestas', n, 'error', error) order by error desc)
        from (
          select pregunta_id, min(dominio) as dominio, count(*) as n,
                 round(avg(case when correcta then 0 else 1 end)::numeric, 2) as error
            from public.respuestas
           group by pregunta_id
          having count(*) >= 5
           order by error desc
           limit 10
        ) q
    ), '[]'::jsonb),
    'referidos', jsonb_build_object(
      'total', (select count(*) from public.referidos),
      'compraron', (select count(*) from public.referidos where recompensado_en is not null),
      'top', coalesce((
        select jsonb_agg(jsonb_build_object('email', pf.email, 'invitados', t.n, 'compraron', t.c) order by t.c desc, t.n desc)
          from (select invitador_id, count(*) n, count(recompensado_en) c from public.referidos
                 group by invitador_id order by count(recompensado_en) desc, count(*) desc limit 5) t
          join public.perfiles pf on pf.id = t.invitador_id
      ), '[]'::jsonb)
    ),
    'origenes', coalesce((
      select jsonb_agg(jsonb_build_object('origen', o.origen, 'registros', o.registros, 'pagantes', o.pagantes) order by o.registros desc)
        from (
          select coalesce(nullif(pf.origen, ''), 'directo') as origen,
                 count(*) as registros,
                 count(*) filter (where exists (select 1 from aprobados a where a.usuario_id = pf.id)) as pagantes
            from public.perfiles pf
           group by 1
           order by 2 desc
           limit 10
        ) o
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.admin_metricas from public, anon, authenticated;
