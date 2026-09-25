-- MAC — la contraseña provisional debe quedar en el formato que acepta el login.
-- Pegar en Supabase → SQL Editor → Run.
-- Después, en Usuarios, pulsa Contraseña → Generar otra vez.

create or replace function public.admin_set_password_hash(target uuid, password_hash text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_superadmin() then
    raise exception 'No autorizado';
  end if;
  if target is null or password_hash is null or password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' then
    raise exception 'Hash inválido';
  end if;

  update auth.users
  set encrypted_password = password_hash,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = target;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  update public.profiles
  set must_change_password = true,
      updated_at = now()
  where id = target;
end;
$$;

revoke all on function public.admin_set_password_hash(uuid, text) from public, anon;
grant execute on function public.admin_set_password_hash(uuid, text) to authenticated;

create or replace function public.admin_confirm_email(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_superadmin() then
    raise exception 'No autorizado';
  end if;
  if target is null then
    raise exception 'Usuario inválido';
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = target;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end;
$$;

revoke all on function public.admin_confirm_email(uuid) from public, anon;
grant execute on function public.admin_confirm_email(uuid) to authenticated;
