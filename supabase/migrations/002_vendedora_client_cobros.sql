-- Sistema Pollo — 002: lectura mínima para cobros de vendedora + grant vista stock
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_initial_schema.sql
-- Permite a vendedora elegir cliente/consignación y ver el recibo emitido.
-- No abre deudas de proveedores.

-- Clientes activos: lectura para cualquier usuario autenticado activo
-- (vendedora necesita la lista para cobrar; admins ya tenían ALL)
create policy clients_authenticated_select on public.clients
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and active = true
    )
  );

-- Consignaciones abiertas/parciales: lectura autenticada (para asociar cobro)
create policy consignments_authenticated_select on public.consignments
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and active = true
    )
  );

-- Pagos de cliente: vendedora puede ver los que registró; admin ya tiene ALL
create policy client_payments_vendedora_select on public.client_payments
  for select using (
    recorded_by = auth.uid()
    or public.is_admin_or_above()
  );

-- Recibos: vendedora ve recibos de pagos que ella registró; admin ALL
create policy receipts_vendedora_select on public.receipts
  for select using (
    issued_by = auth.uid()
    or public.is_admin_or_above()
    or exists (
      select 1 from public.client_payments cp
      where cp.id = receipts.client_payment_id
        and cp.recorded_by = auth.uid()
    )
  );

-- Vista de stock: lectura autenticada (solo admins la usan en UI; RLS de tablas subyacentes aplica)
grant select on public.v_pollo_disponible to authenticated;

-- Código de recibo callable por usuarios autenticados
grant execute on function public.generate_receipt_code() to authenticated;
