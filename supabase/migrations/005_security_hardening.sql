-- MAC / Sistema Pollo — migración 005 (seguridad)
-- Ervin: pegar este archivo completo en Supabase → SQL Editor → Run.
-- No abre políticas. Cierra escalada de rol, lectura de perfiles ajenos
-- y escrituras que el rol vendedora no debería tener por la API (anon key).

-- ---------------------------------------------------------------------------
-- Rol: el metadata del signup lo elige el cliente. Ignorarlo.
-- El alta documentada sigue siendo Table Editor → profiles.role.
-- Solo app_metadata (no escribible por el usuario) puede pedir un rol.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role := 'vendedora';
begin
  if new.raw_app_meta_data ? 'role' then
    begin
      assigned_role := (new.raw_app_meta_data->>'role')::public.app_role;
    exception
      when others then
        assigned_role := 'vendedora';
    end;
  end if;

  insert into public.profiles (id, full_name, username, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'username',
    assigned_role,
    new.email
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

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

revoke all on function public.handle_user_email_updated() from public, anon, authenticated;

-- Cuentas inactivas no tienen rol de aplicación.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true;
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

revoke all on function public.is_admin_or_above() from public, anon;
grant execute on function public.is_admin_or_above() to authenticated;

revoke all on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

revoke all on function public.generate_receipt_code() from public, anon;
grant execute on function public.generate_receipt_code() to authenticated;

-- Impide cambiar rol o reactivar la cuenta si no es superadmin,
-- service role (Table Editor / Admin API) o el SQL Editor (postgres).
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  privileged boolean :=
    coalesce(auth.role(), '') = 'service_role'
    or public.is_superadmin()
    or session_user in ('postgres', 'supabase_admin');
begin
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el id del perfil';
  end if;

  if new.role is distinct from old.role and not privileged then
    raise exception 'Solo superadmin puede cambiar el rol';
  end if;

  if new.active is distinct from old.active and not privileged then
    raise exception 'Solo superadmin puede cambiar si la cuenta está activa';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_privileges() from public, anon;
grant execute on function public.protect_profile_privileges() to authenticated;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

drop policy if exists profiles_update_superadmin on public.profiles;
create policy profiles_update_superadmin on public.profiles
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- La política de 003 dejaba a cualquier sesión leer email y rol de todos.
drop policy if exists profiles_select_attribution on public.profiles;

create or replace view public.profile_labels
with (security_invoker = false) as
select id, full_name, username
from public.profiles;

comment on view public.profile_labels is
  'Nombre para atribución. Sin email ni rol. security_invoker false a propósito: la vista solo expone esas columnas.';

revoke all on table public.profile_labels from public, anon;
grant select on table public.profile_labels to authenticated;

-- ---------------------------------------------------------------------------
-- Edición histórica: superadmin. Admin sigue creando y leyendo.
-- El estado de pago no se abre con UPDATE general: va por funciones acotadas.
-- ---------------------------------------------------------------------------
drop policy if exists purchases_admin_all on public.purchases;

create policy purchases_admin_select on public.purchases
  for select using (public.is_admin_or_above());

create policy purchases_admin_insert on public.purchases
  for insert with check (public.is_admin_or_above());

create policy purchases_superadmin_update on public.purchases
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy purchases_superadmin_delete on public.purchases
  for delete using (public.is_superadmin());

drop policy if exists suppliers_admin_all on public.suppliers;

create policy suppliers_admin_select on public.suppliers
  for select using (public.is_admin_or_above());

create policy suppliers_admin_insert on public.suppliers
  for insert with check (public.is_admin_or_above());

create policy suppliers_superadmin_update on public.suppliers
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy suppliers_superadmin_delete on public.suppliers
  for delete using (public.is_superadmin());

drop policy if exists consignments_admin_all on public.consignments;

create policy consignments_admin_insert on public.consignments
  for insert with check (public.is_admin_or_above());

create policy consignments_superadmin_update on public.consignments
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy consignments_superadmin_delete on public.consignments
  for delete using (public.is_superadmin());

-- Vendedora no registra pagos a proveedores (la UI ya es solo admin).
drop policy if exists supplier_payments_vendedora_insert on public.supplier_payments;

-- El cobro de vendedora no puede atribuirse a otra persona.
drop policy if exists client_payments_vendedora_insert on public.client_payments;
create policy client_payments_vendedora_insert on public.client_payments
  for insert with check (
    recorded_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and active = true
        and role = 'vendedora'
    )
  );

drop policy if exists receipts_vendedora_insert on public.receipts;
create policy receipts_vendedora_insert on public.receipts
  for insert with check (
    issued_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and active = true
        and role = 'vendedora'
    )
    and exists (
      select 1 from public.client_payments cp
      where cp.id = client_payment_id
        and cp.recorded_by = auth.uid()
    )
  );

create or replace function public.stamp_client_payment_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
      new.recorded_by := auth.uid();
    end if;
  else
    new.recorded_by := old.recorded_by;
  end if;
  return new;
end;
$$;

create or replace function public.stamp_supplier_payment_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
      new.recorded_by := auth.uid();
    end if;
  else
    new.recorded_by := old.recorded_by;
  end if;
  return new;
end;
$$;

create or replace function public.stamp_receipt_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
      new.issued_by := auth.uid();
    end if;
  else
    new.issued_by := old.issued_by;
  end if;
  return new;
end;
$$;

revoke all on function public.stamp_client_payment_actor() from public, anon;
revoke all on function public.stamp_supplier_payment_actor() from public, anon;
revoke all on function public.stamp_receipt_actor() from public, anon;
grant execute on function public.stamp_client_payment_actor() to authenticated;
grant execute on function public.stamp_supplier_payment_actor() to authenticated;
grant execute on function public.stamp_receipt_actor() to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
    grant execute on function public.handle_user_email_updated() to supabase_auth_admin;
  end if;
end $$;

drop trigger if exists client_payments_stamp_actor on public.client_payments;
create trigger client_payments_stamp_actor
  before insert or update on public.client_payments
  for each row execute function public.stamp_client_payment_actor();

drop trigger if exists supplier_payments_stamp_actor on public.supplier_payments;
create trigger supplier_payments_stamp_actor
  before insert or update on public.supplier_payments
  for each row execute function public.stamp_supplier_payment_actor();

drop trigger if exists receipts_stamp_actor on public.receipts;
create trigger receipts_stamp_actor
  before insert or update on public.receipts
  for each row execute function public.stamp_receipt_actor();

-- Recalcula solo el estado. No toca precio, cliente ni cantidad.
create or replace function public.refresh_purchase_payment_status(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_paid numeric;
  v_status public.purchase_status;
begin
  if not public.is_admin_or_above() then
    raise exception 'not authorized';
  end if;

  select total_amount into v_total
  from public.purchases
  where id = p_purchase_id;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.supplier_payments
  where purchase_id = p_purchase_id;

  if v_total is null then
    v_status := 'pending_price';
  elsif v_paid <= 0 then
    v_status := 'priced';
  elsif v_paid + 0.001 >= v_total then
    v_status := 'paid';
  else
    v_status := 'partially_paid';
  end if;

  update public.purchases
  set status = v_status, updated_at = now()
  where id = p_purchase_id;
end;
$$;

create or replace function public.refresh_consignment_payment_status(p_consignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_paid numeric;
  v_status public.consignment_status;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  ) then
    raise exception 'not authorized';
  end if;

  if not public.is_admin_or_above() and not exists (
    select 1 from public.client_payments
    where consignment_id = p_consignment_id
      and recorded_by = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  select total_amount into v_total
  from public.consignments
  where id = p_consignment_id;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.client_payments
  where consignment_id = p_consignment_id;

  if v_total is null then
    v_status := case when v_paid > 0 then 'partial' else 'open' end;
  elsif v_paid + 0.001 >= v_total then
    v_status := 'closed';
  elsif v_paid > 0 then
    v_status := 'partial';
  else
    v_status := 'open';
  end if;

  update public.consignments
  set status = v_status, updated_at = now()
  where id = p_consignment_id;
end;
$$;

-- Rollback de una venta recién creada si falla el stock. No borra cobros.
create or replace function public.delete_consignment_if_unpaid(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_above() then
    raise exception 'not authorized';
  end if;

  if exists (
    select 1 from public.client_payments
    where consignment_id = p_id
  ) then
    raise exception 'La venta tiene cobros';
  end if;

  delete from public.consignments
  where id = p_id
    and created_by = auth.uid();
end;
$$;

revoke all on function public.refresh_purchase_payment_status(uuid) from public, anon;
revoke all on function public.refresh_consignment_payment_status(uuid) from public, anon;
revoke all on function public.delete_consignment_if_unpaid(uuid) from public, anon;
grant execute on function public.refresh_purchase_payment_status(uuid) to authenticated;
grant execute on function public.refresh_consignment_payment_status(uuid) to authenticated;
grant execute on function public.delete_consignment_if_unpaid(uuid) to authenticated;

-- La vista sumaba stock como dueña y saltaba RLS. Con security_invoker
-- la vendedora ya no ve el total de inventario.
alter view public.v_pollo_disponible set (security_invoker = true);
revoke all on table public.v_pollo_disponible from public, anon;
grant select on table public.v_pollo_disponible to authenticated;
