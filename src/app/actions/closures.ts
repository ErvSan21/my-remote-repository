"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  debtForSupplier,
  type PaymentDebtRow,
  type PurchaseDebtRow,
} from "@/lib/debts";

export async function getClosureSupplierData(supplierId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .maybeSingle();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("purchase_date", { ascending: true });

  const { data: payments } = await supabase
    .from("supplier_payments")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("paid_at", { ascending: true });

  const purchaseRows = (purchases ?? []).map((p) => ({
    id: p.id as string,
    supplier_id: p.supplier_id as string,
    total_amount: p.total_amount == null ? null : Number(p.total_amount),
    status: p.status,
  })) as PurchaseDebtRow[];

  const paymentRows = (payments ?? []).map((p) => ({
    supplier_id: p.supplier_id as string,
    purchase_id: (p.purchase_id as string | null) ?? null,
    amount: Number(p.amount),
  })) as PaymentDebtRow[];

  const owed = debtForSupplier(supplierId, purchaseRows, paymentRows);

  return {
    supplier,
    purchases: purchases ?? [],
    payments: payments ?? [],
    owed,
  };
}

export async function getWeeklyClosureData(fromIso: string, toIso: string) {
  await requireAdmin();
  const supabase = await createClient();

  const [purchases, supplierPayments, clientPayments, consignments] =
    await Promise.all([
      supabase
        .from("purchases")
        .select("*, suppliers(name)")
        .gte("purchase_date", fromIso)
        .lte("purchase_date", toIso),
      supabase
        .from("supplier_payments")
        .select("*, suppliers(name)")
        .gte("paid_at", `${fromIso}T00:00:00`)
        .lte("paid_at", `${toIso}T23:59:59`),
      supabase
        .from("client_payments")
        .select("*, clients(name)")
        .gte("paid_at", `${fromIso}T00:00:00`)
        .lte("paid_at", `${toIso}T23:59:59`),
      supabase
        .from("consignments")
        .select("*, clients(name)")
        .gte("left_at", `${fromIso}T00:00:00`)
        .lte("left_at", `${toIso}T23:59:59`),
    ]);

  const sum = (rows: { amount?: unknown; total_amount?: unknown }[], key: "amount" | "total_amount") =>
    rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);

  return {
    fromIso,
    toIso,
    purchases: purchases.data ?? [],
    supplierPayments: supplierPayments.data ?? [],
    clientPayments: clientPayments.data ?? [],
    consignments: consignments.data ?? [],
    totals: {
      purchasesAmount: sum(
        (purchases.data ?? []).filter((p) => p.total_amount != null),
        "total_amount",
      ),
      paidSuppliers: sum(supplierPayments.data ?? [], "amount"),
      collectedClients: sum(clientPayments.data ?? [], "amount"),
      birdsConsigned: (consignments.data ?? []).reduce(
        (s, c) => s + Number(c.quantity_birds),
        0,
      ),
    },
    errors: [
      purchases.error?.message,
      supplierPayments.error?.message,
      clientPayments.error?.message,
      consignments.error?.message,
    ].filter(Boolean),
  };
}

export async function listSuppliersForClosure() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("active", true)
    .order("name");
  return data ?? [];
}
