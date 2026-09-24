-- MAC / Sistema Pollo — migración 006
-- Ervin: pegar este archivo completo en Supabase → SQL Editor → Run.
-- La 005 quitó la política general de consignments y dejó el alta sin lectura.
-- Insertar y devolver la fila (o verla en Ventas) falla con:
--   new row violates row-level security policy for table "consignments"

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active = true
      and role in ('admin', 'superadmin')
  );
$$;

revoke all on function public.is_admin_or_above() from public, anon;
grant execute on function public.is_admin_or_above() to authenticated;

drop policy if exists consignments_authenticated_select on public.consignments;
create policy consignments_authenticated_select on public.consignments
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and active = true
    )
  );

drop policy if exists consignments_admin_insert on public.consignments;
create policy consignments_admin_insert on public.consignments
  for insert with check (public.is_admin_or_above());

grant usage, select on sequence public.consignments_sale_number_seq to authenticated;
