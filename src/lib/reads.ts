import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const PURCHASE_LIST_SELECT =
  "id, supplier_id, purchase_date, quantity_birds, unit_price, total_amount, status, notes, created_by, created_at, suppliers(name, phone)";

const SUPPLIER_LIST_SELECT =
  "id, name, location, phone, notes, active, created_at, updated_at";

/** Una sola lectura de proveedores por request, compartida entre pantallas. */
export const readSuppliers = cache(async (includeInactive: boolean) => {
  const supabase = await createClient();
  let query = supabase
    .from("suppliers")
    .select(SUPPLIER_LIST_SELECT)
    .order("name", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  return query;
});

/** Compras con el proveedor. La reutilizan el listado y el cálculo de deudas. */
export const readPurchasesForList = cache(async () => {
  const supabase = await createClient();
  return supabase
    .from("purchases")
    .select(PURCHASE_LIST_SELECT)
    .order("created_at", { ascending: false });
});

/** Montos de pagos a proveedores, sin el detalle de los últimos movimientos. */
export const readSupplierPaymentAmounts = cache(async () => {
  const supabase = await createClient();
  return supabase
    .from("supplier_payments")
    .select("supplier_id, purchase_id, amount");
});
