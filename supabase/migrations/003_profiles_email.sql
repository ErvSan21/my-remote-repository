-- MAC / Sistema Pollo — migración 003
-- Email en profiles para mostrar quién registró ventas/cobros.
-- Ervin: pegar en Supabase → SQL Editor → Run.

alter table public.profiles
  add column if not exists email text;

-- Backfill desde auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

create index if not exists profiles_email_idx on public.profiles (email);

-- Trigger: guardar email al crear usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'username',
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'vendedora'),
    new.email
  );
  return new;
end;
$$;

-- Mantener email sincronizado si cambia en Auth
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();

-- Lectura de email/nombre para atribución en ventas (vendedora + admin)
drop policy if exists profiles_select_attribution on public.profiles;
create policy profiles_select_attribution on public.profiles
  for select
  using (auth.uid() is not null);
