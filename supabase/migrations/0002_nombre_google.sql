-- Registro con Google: el nombre llega como full_name o name (no como "nombre").
-- Ejecutar en Supabase: SQL Editor → pegar este archivo → Run.

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, email, nombre, origen)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nombre', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    nullif(new.raw_user_meta_data ->> 'origen', '')
  );
  return new;
end;
$$;

-- Completa el nombre de quienes ya se registraron con Google antes de esta migración.
update public.perfiles p
   set nombre = coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', ''))
  from auth.users u
 where u.id = p.id
   and p.nombre is null;
