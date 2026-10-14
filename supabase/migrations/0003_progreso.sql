-- Progreso del alumno: meta de examen, respuestas por pregunta y resumen para el panel.
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run.

-- ─────────────────────────────────────────────────────────────
-- Meta del alumno (onboarding) y resultado de su examen real.
-- ─────────────────────────────────────────────────────────────
alter table public.perfiles
  add column nivel text check (nivel in ('nuevo', 'basico', 'intermedio', 'avanzado')),
  add column fecha_examen date,
  add column resultado_examen text check (resultado_examen in ('aprobado', 'no_aprobado'));

-- El alumno puede editar su meta; premium_hasta sigue siendo exclusivo de registrar_pago.
grant update (nombre, nivel, fecha_examen, resultado_examen) on public.perfiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Nuevos modos del simulador.
-- ─────────────────────────────────────────────────────────────
alter table public.intentos drop constraint intentos_modo_check;
alter table public.intentos add constraint intentos_modo_check
  check (modo in ('practica', 'examen', 'diagnostico', 'dominio', 'repaso'));

-- ─────────────────────────────────────────────────────────────
-- Respuestas individuales: permiten medir dominio por tema y repasar errores.
-- ─────────────────────────────────────────────────────────────
create table public.respuestas (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  intento_id  bigint references public.intentos (id) on delete cascade,
  pregunta_id text not null,
  dominio     text not null,
  correcta    boolean not null,
  creado_en   timestamptz not null default now()
);

create index respuestas_usuario_pregunta_idx on public.respuestas (usuario_id, pregunta_id, creado_en desc);
create index respuestas_usuario_fecha_idx on public.respuestas (usuario_id, creado_en desc);

alter table public.respuestas enable row level security;
create policy "ver mis respuestas" on public.respuestas for select to authenticated
  using ((select auth.uid()) = usuario_id);
revoke insert, update, delete on public.respuestas from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Registra un intento completo (intento + respuestas) en una sola transacción.
-- Se ejecuta con los permisos del usuario: solo puede escribir lo suyo.
-- ─────────────────────────────────────────────────────────────
create function public.registrar_intento(
  p_modo        text,
  p_total       int,
  p_correctas   int,
  p_segundos    int,
  p_por_dominio jsonb,
  p_respuestas  jsonb   -- [{ "pregunta_id": "p-001", "dominio": "ingesta", "correcta": true }, ...]
)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_id      bigint;
begin
  if v_usuario is null then
    raise exception 'no autenticado';
  end if;

  insert into public.intentos (usuario_id, modo, total, correctas, segundos, por_dominio)
  values (v_usuario, p_modo, p_total, p_correctas, p_segundos, coalesce(p_por_dominio, '{}'::jsonb))
  returning id into v_id;

  insert into public.respuestas (usuario_id, intento_id, pregunta_id, dominio, correcta)
  select v_usuario, v_id, r ->> 'pregunta_id', r ->> 'dominio', (r ->> 'correcta')::boolean
    from jsonb_array_elements(coalesce(p_respuestas, '[]'::jsonb)) as r
   limit 200;

  return v_id;
end;
$$;

revoke execute on function public.registrar_intento from public, anon;
grant execute on function public.registrar_intento to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Resumen para el panel: última respuesta por pregunta, días activos e intentos recientes.
-- ─────────────────────────────────────────────────────────────
create function public.mi_resumen()
returns jsonb
language sql
stable
security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'ultimas', coalesce((
      select jsonb_agg(jsonb_build_object('pregunta_id', u.pregunta_id, 'dominio', u.dominio, 'correcta', u.correcta, 'veces', u.veces))
        from (
          select distinct on (r.pregunta_id)
                 r.pregunta_id, r.dominio, r.correcta,
                 count(*) over (partition by r.pregunta_id) as veces
            from public.respuestas r
           where r.usuario_id = auth.uid()
           order by r.pregunta_id, r.creado_en desc
        ) u
    ), '[]'::jsonb),
    'dias', coalesce((
      select jsonb_agg(d.dia order by d.dia desc)
        from (
          select distinct (r.creado_en at time zone 'America/Lima')::date as dia
            from public.respuestas r
           where r.usuario_id = auth.uid()
             and r.creado_en > now() - interval '90 days'
        ) d
    ), '[]'::jsonb),
    'intentos', coalesce((
      select jsonb_agg(jsonb_build_object('modo', i.modo, 'total', i.total, 'correctas', i.correctas, 'creado_en', i.creado_en) order by i.creado_en)
        from (
          select modo, total, correctas, creado_en
            from public.intentos
           where usuario_id = auth.uid()
           order by creado_en desc
           limit 12
        ) i
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.mi_resumen from public, anon;
grant execute on function public.mi_resumen to authenticated;
