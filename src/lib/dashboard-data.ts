import { createClient } from "@/lib/supabase/server";
import { purchaseBalance, ventaBalance } from "@/lib/debts";

export type DashboardSale = {
  id: string;
  client_id: string;
  created_at: string;
  created_by: string | null;
  total_amount: number | null;
  quantity_birds: number;
  unit_price: number | null;
  pending_amount: number;
  cash_amount: number;
  qr_amount: number;
};

export type DashboardPurchase = {
  id: string;
  supplier_id: string;
  created_at: string;
  created_by: string | null;
  purchase_date: string;
  total_amount: number | null;
  unit_price: number | null;
  quantity_birds: number;
  paid_amount: number;
};

export type DashboardPayment = {
  party_id: string;
  amount: number;
  method: string;
  paid_at: string;
  recorded_by: string | null;
};

export type DashboardParty = {
  id: string;
  name: string;
  place: string | null;
};

/**
 * Cifras del dashboard en una sola tanda: ventas, compras, cobros, pagos,
 * clientes, proveedores y nombres de quien registró cada movimiento.
 */
export async function loadDashboardSource(): Promise<{
  ventas: DashboardSale[];
  purchases: DashboardPurchase[];
  clientPayments: DashboardPayment[];
  supplierPayments: DashboardPayment[];
  clients: DashboardParty[];
  suppliers: DashboardParty[];
  people: Record<string, string>;
  stock: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const [
    ventasRes,
    ventaPaysRes,
    comprasRes,
    compraPaysRes,
    stockRes,
    clientsRes,
    suppliersRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("consignments")
      .select("id, client_id, total_amount, unit_price, quantity_birds, created_at, created_by"),
    supabase
      .from("client_payments")
      .select("client_id, consignment_id, amount, method, paid_at, recorded_by"),
    supabase
      .from("purchases")
      .select(
        "id, supplier_id, total_amount, unit_price, quantity_birds, purchase_date, created_at, created_by",
      ),
    supabase
      .from("supplier_payments")
      .select("supplier_id, purchase_id, amount, method, paid_at, recorded_by"),
    supabase
      .from("inventory_lots")
      .select("quantity_birds")
      .is("closed_at", null),
    supabase.from("clients").select("id, name, zone"),
    supabase.from("suppliers").select("id, name, location"),
    supabase.from("profiles").select("id, full_name, username"),
  ]);

  const error =
    ventasRes.error?.message ||
    ventaPaysRes.error?.message ||
    comprasRes.error?.message ||
    compraPaysRes.error?.message ||
    stockRes.error?.message ||
    clientsRes.error?.message ||
    suppliersRes.error?.message ||
    null;

  const saleRows = (ventaPaysRes.data ?? []).filter((row) => row.consignment_id);
  const paidBySale = sumBy(saleRows, (row) => row.consignment_id, (row) => row.amount);
  const cashBySale = sumBy(
    saleRows.filter((row) => row.method === "cash"),
    (row) => row.consignment_id,
    (row) => row.amount,
  );
  const qrBySale = sumBy(
    saleRows.filter((row) => row.method === "qr"),
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
      id: row.id,
      client_id: row.client_id,
      created_at: row.created_at,
      created_by: row.created_by ?? null,
      total_amount: total,
      unit_price: row.unit_price == null ? null : Number(row.unit_price),
      quantity_birds: Number(row.quantity_birds ?? 0),
      pending_amount: balance.pending_amount,
      cash_amount: cashBySale.get(row.id) ?? 0,
      qr_amount: qrBySale.get(row.id) ?? 0,
    };
  });

  const purchases: DashboardPurchase[] = (comprasRes.data ?? []).map((row) => {
    const total = row.total_amount == null ? null : Number(row.total_amount);
    const balance = purchaseBalance(total, paidByPurchase.get(row.id) ?? 0);
    return {
      id: row.id,
      supplier_id: row.supplier_id,
      created_at: row.created_at,
      created_by: row.created_by ?? null,
      purchase_date: row.purchase_date,
      total_amount: total,
      unit_price: row.unit_price == null ? null : Number(row.unit_price),
      quantity_birds: Number(row.quantity_birds ?? 0),
      paid_amount: balance.paid_amount,
    };
  });

  const toPayment = (row: {
    amount: number | null;
    method: string | null;
    paid_at: string;
    recorded_by: string | null;
  }) => ({
    amount: Number(row.amount ?? 0),
    method: row.method ?? "cash",
    paid_at: row.paid_at,
    recorded_by: row.recorded_by ?? null,
  });

  const clientPayments: DashboardPayment[] = (ventaPaysRes.data ?? []).map((row) => ({
    party_id: row.client_id,
    ...toPayment(row),
  }));
  const supplierPayments: DashboardPayment[] = (compraPaysRes.data ?? []).map((row) => ({
    party_id: row.supplier_id,
    ...toPayment(row),
  }));

  const clients: DashboardParty[] = (clientsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    place: row.zone ?? null,
  }));
  const suppliers: DashboardParty[] = (suppliersRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    place: row.location ?? null,
  }));

  // Nombres de quien registró: si el perfil no se puede leer, la actividad sale sin autor.
  const people: Record<string, string> = {};
  for (const row of profilesRes.data ?? []) {
    const name = row.full_name?.trim() || row.username?.trim();
    if (name) people[row.id] = name;
  }

  const stock = (stockRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.quantity_birds ?? 0),
    0,
  );

  return {
    ventas,
    purchases,
    clientPayments,
    supplierPayments,
    clients,
    suppliers,
    people,
    stock,
    error,
  };
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
