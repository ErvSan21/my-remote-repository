-- MAC — alta de usuario sin correo de confirmación.
-- Supabase corta el envío cuando se supera el límite ("email rate limit exceeded").
-- Pegar en Supabase → SQL Editor → Run.
-- Después, en Usuarios, crea el usuario otra vez.

alter table public.profiles
  add column if not exists email text,
  add column if not exists enabled_modules text[],
  add column if not exists must_change_password boolean not null default false;

create or replace function public.admin_create_user_hash(
  p_email text,
  p_password_hash text,
  p_full_name text,
  p_role text,
  p_modules text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
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
  if p_password_hash is null or p_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' then
    raise exception 'Hash inválido';
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
    p_password_hash,
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

  insert into public.profiles (
    id,
    full_name,
    role,
    email,
    active,
    enabled_modules,
    must_change_password
  ) values (
    new_id,
    clean_name,
    role_value,
    clean_email,
    true,
    p_modules,
    true
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      email = excluded.email,
      active = true,
      enabled_modules = excluded.enabled_modules,
      must_change_password = true,
      updated_at = now();

  return new_id;
exception
  when unique_violation then
    raise exception 'Ese correo ya tiene una cuenta';
  when invalid_text_representation then
    raise exception 'Elige un rol válido';
end;
$$;

revoke all on function public.admin_create_user_hash(text, text, text, text, text[]) from public, anon;
grant execute on function public.admin_create_user_hash(text, text, text, text, text[]) to authenticated;
