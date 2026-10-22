-- Hora del examen: el alumno registra su resultado apenas termina (inicio + duración), sin esperar al día siguiente.
-- La hora es la de Lima.

alter table public.perfiles add column if not exists hora_examen time;
grant update (hora_examen) on public.perfiles to authenticated;

-- Garantía: los simulacros cuentan si se hicieron antes del inicio del examen
-- (o hasta el final de ese día, si el alumno no indicó la hora).
create or replace function public.solicitar_garantia(
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
  v_inicio  timestamp;
begin
  if v_usuario is null then return 'sin_sesion'; end if;
  if p_reporte is not null and p_reporte not like v_usuario::text || '/%' then return 'reporte_invalido'; end if;
  select resultado_examen, fecha_examen, hora_examen into v_perfil from public.perfiles where id = v_usuario;

  if v_perfil.resultado_examen is distinct from 'no_aprobado' or v_perfil.fecha_examen is null then return 'sin_resultado'; end if;
  if v_hoy - v_perfil.fecha_examen > p_plazo_dias or v_perfil.fecha_examen > v_hoy then return 'fuera_de_plazo'; end if;
  if exists (select 1 from public.garantias where usuario_id = v_usuario and certificacion = p_certificacion) then return 'ya_solicitada'; end if;
  if not exists (
    select 1 from public.pagos
     where usuario_id = v_usuario and estado = 'approved' and acceso_otorgado
       and coalesce(certificacion, p_certificacion) in (p_certificacion, '*')
  ) then return 'sin_pase'; end if;

  v_inicio := case when v_perfil.hora_examen is null
                   then (v_perfil.fecha_examen + 1)::timestamp
                   else v_perfil.fecha_examen + v_perfil.hora_examen end;
  if (select count(*) from public.intentos
       where usuario_id = v_usuario and certificacion = p_certificacion and modo = 'examen' and total >= 45
         and (creado_en at time zone 'America/Lima') < v_inicio) < p_minimo_simulacros
  then return 'pocos_simulacros'; end if;

  insert into public.garantias (usuario_id, certificacion, fecha_examen, reporte)
  values (v_usuario, p_certificacion, v_perfil.fecha_examen, p_reporte);
  return 'ok';
end;
$$;
