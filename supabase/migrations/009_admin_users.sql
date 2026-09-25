-- MAC — alta, baja y contraseña provisional sin service role.
-- Pegar en Supabase → SQL Editor → Run.
-- Incluye las columnas de 008 por si esa migración todavía no se ejecutó.

alter table public.profiles
  add column if not exists email text,
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
    raise exception 'No autorizado';
  end if;

  update public.profiles
  set must_change_password = false,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.clear_password_change() from public, anon;
grant execute on function public.clear_password_change() to authenticated;

create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_modules text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_id uuid := gen_random_uuid();
  clean_email text := lower(trim(coalesce(p_email, '')));
  clean_name text := trim(coalesce(p_full_name, ''));
  role_value public.app_role;
begin
  if not public.is_superadmin() then
    raise exception 'No autorizado';
  end if;
  if clean_email = '' or position('@' in clean_email) = 0 then
    raise exception 'Escribe un correo válido';
  end if;
  if clean_name = '' then
    raise exception 'Escribe el nombre';
  end if;
  if p_password is null or length(p_password) < 8 or length(p_password) > 72 then
    raise exception 'La contraseña debe tener entre 8 y 72 caracteres';
  end if;

  role_value := p_role::public.app_role;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    clean_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', clean_name, 'role', role_value, 'email', clean_email),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object(
      'sub', new_id::text,
      'email', clean_email,
      'email_verified', true
    ),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );

  update public.profiles
  set full_name = clean_name,
      role = role_value,
      email = clean_email,
      active = true,
      enabled_modules = p_modules,
      must_change_password = true,
      updated_at = now()
  where id = new_id;

  return new_id;
exception
  when unique_violation then
    raise exception 'Ese correo ya tiene una cuenta';
  when invalid_text_representation then
    raise exception 'Elige un rol válido';
end;
$$;

revoke all on function public.admin_create_user(text, text, text, text, text[]) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text, text[]) to authenticated;

create or replace function public.admin_set_password(target uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_superadmin() then
    raise exception 'No autorizado';
  end if;
  if target is null or new_password is null or length(new_password) < 8 or length(new_password) > 72 then
    raise exception 'Contraseña inválida';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
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

revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

create or replace function public.admin_delete_user(target uuid)
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
  if target = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;

  delete from auth.users where id = target;
  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
