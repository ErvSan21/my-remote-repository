-- MAC — módulos por usuario y contraseña provisional
-- Pegar en Supabase → SQL Editor → Run.
-- enabled_modules null = todos los módulos del rol.
-- must_change_password obliga a cambiar la contraseña provisional al ingresar.

alter table public.profiles
  add column if not exists enabled_modules text[],
  add column if not exists must_change_password boolean not null default false;

create or replace function public.clear_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  update public.profiles
  set must_change_password = false,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.clear_password_change() from public, anon;
grant execute on function public.clear_password_change() to authenticated;
