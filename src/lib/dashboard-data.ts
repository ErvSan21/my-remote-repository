import { createClient } from "@/lib/supabase/server";
import { purchaseBalance, ventaBalance } from "@/lib/debts";

export type DashboardSale = {
  created_at: string;
  total_amount: number | null;
  quantity_birds: number;
  pending_amount: number;
};

export type DashboardPurchase = {
  created_at: string;
  purchase_date: string;
  total_amount: number | null;
  quantity_birds: number;
  paid_amount: number;
};

/**
 * Cifras del dashboard en una sola tanda.
 * No trae clientes, proveedores ni el historial de cada pago.
 */
export async function loadDashboardSource(): Promise<{
  ventas: DashboardSale[];
  purchases: DashboardPurchase[];
  stock: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const [ventasRes, ventaPaysRes, comprasRes, compraPaysRes, stockRes] =
    await Promise.all([
      supabase
        .from("consignments")
        .select("id, total_amount, quantity_birds, created_at"),
      supabase
        .from("client_payments")
        .select("consignment_id, amount")
        .not("consignment_id", "is", null),
      supabase
        .from("purchases")
        .select("id, total_amount, quantity_birds, purchase_date, created_at"),
      supabase.from("supplier_payments").select("purchase_id, amount"),
      supabase
        .from("inventory_lots")
        .select("quantity_birds")
        .is("closed_at", null),
    ]);

  const error =
    ventasRes.error?.message ||
    ventaPaysRes.error?.message ||
    comprasRes.error?.message ||
    compraPaysRes.error?.message ||
    stockRes.error?.message ||
    null;

  const paidBySale = sumBy(
    ventaPaysRes.data ?? [],
    (row) => row.consignment_id,
    (row) => row.amount,
  );
  const paidByPurchase = sumBy(
    compraPaysRes.data ?? [],
    (row) => row.purchase_id,
    (row) => row.amount,
  );

  const ventas: DashboardSale[] = (ventasRes.data ?? []).map((row) => {
    const total = row.total_amount == null ? null : Number(row.total_amount);
    const balance = ventaBalance(total, paidBySale.get(row.id) ?? 0);
    return {
      created_at: row.created_at,
      total_amount: total,
      quantity_birds: Number(row.quantity_birds ?? 0),
      pending_amount: balance.pending_amount,
    };
  });

  const purchases: DashboardPurchase[] = (comprasRes.data ?? []).map((row) => {
    const total = row.total_amount == null ? null : Number(row.total_amount);
    const balance = purchaseBalance(total, paidByPurchase.get(row.id) ?? 0);
    return {
      created_at: row.created_at,
      purchase_date: row.purchase_date,
      total_amount: total,
      quantity_birds: Number(row.quantity_birds ?? 0),
      paid_amount: balance.paid_amount,
    };
  });

  const stock = (stockRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.quantity_birds ?? 0),
    0,
  );

  return { ventas, purchases, stock, error };
}

function sumBy<T>(
  rows: T[],
  idOf: (row: T) => string | null,
  amountOf: (row: T) => number | null,
) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const id = idOf(row);
    if (!id) continue;
    totals.set(id, (totals.get(id) ?? 0) + Number(amountOf(row) ?? 0));
  }
  return totals;
}
