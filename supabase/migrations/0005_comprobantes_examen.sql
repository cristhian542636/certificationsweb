-- Comprobantes del examen: reporte para la garantía (archivo privado) y enlace de la credencial al aprobar.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run (primero en datacert-nonprod y, antes de pasar a main, en producción).

-- ─────────────────────────────────────────────────────────────
-- Almacenamiento privado de reportes (PDF o imagen, máximo 4 MB: Vercel acepta hasta 4.5 MB por solicitud).
-- Solo el servidor (service role) sube y lee archivos; el alumno nunca accede al bucket directamente.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reportes', 'reportes', false, 4194304, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

alter table public.garantias add column reporte text;

-- ─────────────────────────────────────────────────────────────
-- Enlace público de la credencial (insignia digital) de quien aprobó.
-- ─────────────────────────────────────────────────────────────
alter table public.perfiles
  add column insignia_url text check (insignia_url is null or (insignia_url ~ '^https://' and length(insignia_url) <= 300));

grant update (insignia_url) on public.perfiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Solicitud de garantía con el reporte adjunto (ruta dentro del bucket, siempre en la carpeta del alumno).
-- ─────────────────────────────────────────────────────────────
drop function public.solicitar_garantia(text, int, int);

create function public.solicitar_garantia(
  p_certificacion     text,
  p_reporte           text default null,
  p_minimo_simulacros int default 2,
  p_plazo_dias        int default 15
)
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
  if p_reporte is not null and p_reporte not like v_usuario::text || '/%' then return 'reporte_invalido'; end if;
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

  insert into public.garantias (usuario_id, certificacion, fecha_examen, reporte)
  values (v_usuario, p_certificacion, v_perfil.fecha_examen, p_reporte);
  return 'ok';
end;
$$;

revoke execute on function public.solicitar_garantia from public, anon;
grant execute on function public.solicitar_garantia to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Métricas de /admin: reporte de cada garantía y aprobados verificados con credencial.
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_metricas()
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
      'aprobados_con_credencial', (select count(*) from public.perfiles where resultado_examen = 'aprobado' and insignia_url is not null),
      'no_aprobados', (select count(*) from public.perfiles where resultado_examen = 'no_aprobado')
    ),
    'aprobados_recientes', coalesce((
      select jsonb_agg(jsonb_build_object('email', email, 'nombre', nombre, 'fecha_examen', fecha_examen, 'insignia_url', insignia_url)
                       order by actualizado_en desc)
        from (select * from public.perfiles where resultado_examen = 'aprobado' order by actualizado_en desc limit 10) a
    ), '[]'::jsonb),
    'garantias_pendientes', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'email', pf.email, 'nombre', pf.nombre, 'certificacion', g.certificacion,
                                          'fecha_examen', g.fecha_examen, 'creado_en', g.creado_en, 'reporte', g.reporte) order by g.creado_en)
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
