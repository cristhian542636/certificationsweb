-- Esquema inicial: perfiles de usuarios, pagos e intentos del simulador.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run.

-- ─────────────────────────────────────────────────────────────
-- Perfiles: un registro por cada usuario registrado (gratis o de pago).
-- ─────────────────────────────────────────────────────────────
create table public.perfiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  nombre         text,
  premium_hasta  timestamptz,
  origen         text,                       -- utm_source o canal de captación (opcional)
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index perfiles_email_idx on public.perfiles (lower(email));

-- Crea el perfil automáticamente al registrarse.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, email, nombre, origen)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'nombre', ''),
    nullif(new.raw_user_meta_data ->> 'origen', '')
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ─────────────────────────────────────────────────────────────
-- Pagos: cada pago reportado por Mercado Pago (aprobado, pendiente o rechazado).
-- ─────────────────────────────────────────────────────────────
create table public.pagos (
  id                 bigint generated always as identity primary key,
  usuario_id         uuid not null references public.perfiles (id) on delete cascade,
  proveedor          text not null default 'mercadopago',
  proveedor_pago_id  text not null,
  producto           text not null,
  monto              numeric(10, 2) not null,
  moneda             text not null,
  metodo             text,                   -- yape, visa, master, etc.
  estado             text not null,          -- approved, pending, rejected, refunded…
  estado_detalle     text,
  meses_acceso       int not null,
  acceso_otorgado    boolean not null default false,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  unique (proveedor, proveedor_pago_id)
);

create index pagos_usuario_idx on public.pagos (usuario_id);

-- Registra o actualiza un pago y, si quedó aprobado, extiende el acceso premium UNA sola vez.
-- Es idempotente: Mercado Pago puede notificar el mismo pago varias veces.
create function public.registrar_pago(
  p_usuario_id        uuid,
  p_proveedor_pago_id text,
  p_producto          text,
  p_monto             numeric,
  p_moneda            text,
  p_metodo            text,
  p_estado            text,
  p_estado_detalle    text,
  p_meses_acceso      int
)
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  v_otorgado boolean;
  v_premium  timestamptz;
begin
  insert into public.pagos as p (
    usuario_id, proveedor_pago_id, producto, monto, moneda, metodo, estado, estado_detalle, meses_acceso
  )
  values (
    p_usuario_id, p_proveedor_pago_id, p_producto, p_monto, p_moneda, p_metodo, p_estado, p_estado_detalle, p_meses_acceso
  )
  on conflict (proveedor, proveedor_pago_id) do update
    set estado = excluded.estado,
        estado_detalle = excluded.estado_detalle,
        metodo = coalesce(excluded.metodo, p.metodo),
        actualizado_en = now()
  returning acceso_otorgado into v_otorgado;

  if p_estado = 'approved' and not v_otorgado then
    update public.perfiles
       set premium_hasta = greatest(coalesce(premium_hasta, now()), now()) + make_interval(months => p_meses_acceso),
           actualizado_en = now()
     where id = p_usuario_id;

    update public.pagos
       set acceso_otorgado = true
     where proveedor = 'mercadopago' and proveedor_pago_id = p_proveedor_pago_id;
  end if;

  -- Si el pago fue devuelto o anulado después de otorgar el acceso, se revoca.
  if p_estado in ('refunded', 'charged_back', 'cancelled') and v_otorgado then
    update public.perfiles
       set premium_hasta = premium_hasta - make_interval(months => p_meses_acceso),
           actualizado_en = now()
     where id = p_usuario_id;

    update public.pagos
       set acceso_otorgado = false
     where proveedor = 'mercadopago' and proveedor_pago_id = p_proveedor_pago_id;
  end if;

  select premium_hasta into v_premium from public.perfiles where id = p_usuario_id;
  return v_premium;
end;
$$;

-- Solo el backend (service role) puede registrar pagos.
revoke execute on function public.registrar_pago from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Intentos del simulador: resultados de cada práctica o examen.
-- ─────────────────────────────────────────────────────────────
create table public.intentos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  modo        text not null check (modo in ('practica', 'examen')),
  total       int not null check (total > 0),
  correctas   int not null check (correctas >= 0 and correctas <= total),
  por_dominio jsonb not null default '{}'::jsonb,
  segundos    int,
  creado_en   timestamptz not null default now()
);

create index intentos_usuario_idx on public.intentos (usuario_id, creado_en desc);

-- ─────────────────────────────────────────────────────────────
-- Seguridad a nivel de fila (RLS): cada usuario solo ve lo suyo.
-- ─────────────────────────────────────────────────────────────
alter table public.perfiles enable row level security;
alter table public.pagos    enable row level security;
alter table public.intentos enable row level security;

create policy "ver mi perfil"     on public.perfiles for select to authenticated using ((select auth.uid()) = id);
create policy "ver mis pagos"     on public.pagos    for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "ver mis intentos"  on public.intentos for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "crear mis intentos" on public.intentos for insert to authenticated with check ((select auth.uid()) = usuario_id);

-- El usuario solo puede editar su nombre; premium_hasta solo lo cambia registrar_pago.
revoke insert, update, delete on public.perfiles from anon, authenticated;
revoke insert, update, delete on public.pagos from anon, authenticated;
grant update (nombre) on public.perfiles to authenticated;
create policy "editar mi nombre" on public.perfiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ─────────────────────────────────────────────────────────────
-- Vista para tu análisis de negocio (solo accesible con service role / SQL Editor).
-- ─────────────────────────────────────────────────────────────
create view public.metricas_diarias
with (security_invoker = true) as
select
  d::date                                                              as dia,
  (select count(*) from public.perfiles where creado_en::date = d::date) as registros,
  (select count(*) from public.pagos where estado = 'approved' and creado_en::date = d::date) as ventas,
  (select coalesce(sum(monto), 0) from public.pagos where estado = 'approved' and creado_en::date = d::date) as ingresos
from generate_series(
  (select coalesce(min(creado_en), now()) from public.perfiles)::date,
  now()::date,
  interval '1 day'
) as d;

revoke all on public.metricas_diarias from anon, authenticated;
