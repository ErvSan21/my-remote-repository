-- MAC / Sistema Pollo — migración 007
-- Permite que cada usuario actualice su propio nombre.
-- Ervin: pegar en Supabase → SQL Editor → Run.

create or replace function public.update_own_profile(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := trim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  if clean = '' or length(clean) > 120 then
    raise exception 'Nombre inválido';
  end if;

  update public.profiles
  set full_name = clean, updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text) from public, anon;
grant execute on function public.update_own_profile(text) to authenticated;
