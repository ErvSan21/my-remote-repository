"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  debtForSupplier,
  paidTowardPurchase,
  statusAfterPayment,
  totalDebtAll,
  type PaymentDebtRow,
  type PurchaseDebtRow,
} from "@/lib/debts";
import type { ActionResult, SupplierPayment } from "@/lib/data-types";
import type { PaymentMethod } from "@/lib/types";

export type SupplierDebtSummary = {
  supplier_id: string;
  supplier_name: string;
  owed: number;
};

export async function getSupplierDebtsAction(): Promise<{
  perSupplier: SupplierDebtSummary[];
  totalOwed: number;
  purchases: PurchaseDebtRow[];
  payments: PaymentDebtRow[];
  recentPayments: SupplierPayment[];
  error: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();

  const [suppliersRes, purchasesRes, paymentsRes] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    supabase.from("purchases").select("id, supplier_id, total_amount, status"),
    supabase
      .from("supplier_payments")
      .select("*, suppliers(name)")
      .order("paid_at", { ascending: false })
      .limit(40),
  ]);

  if (suppliersRes.error || purchasesRes.error || paymentsRes.error) {
    return {
      perSupplier: [],
      totalOwed: 0,
      purchases: [],
      payments: [],
      recentPayments: [],
      error:
        suppliersRes.error?.message ||
        purchasesRes.error?.message ||
        paymentsRes.error?.message ||
        "Error al cargar deudas.",
    };
  }

  const purchases = (purchasesRes.data ?? []).map((p) => ({
    id: p.id as string,
    supplier_id: p.supplier_id as string,
    total_amount: p.total_amount == null ? null : Number(p.total_amount),
    status: p.status,
  })) as PurchaseDebtRow[];

  const allPaymentsRes = await supabase
    .from("supplier_payments")
    .select("supplier_id, purchase_id, amount");

  const payments = (allPaymentsRes.data ?? []).map((p) => ({
    supplier_id: p.supplier_id as string,
    purchase_id: (p.purchase_id as string | null) ?? null,
    amount: Number(p.amount),
  }));

  const perSupplier = (suppliersRes.data ?? []).map((s) => ({
    supplier_id: s.id as string,
    supplier_name: s.name as string,
    owed: debtForSupplier(s.id as string, purchases, payments),
  }));

  const totalOwed = totalDebtAll(purchases, payments);

  return {
    perSupplier,
    totalOwed,
    purchases,
    payments,
    recentPayments: (paymentsRes.data ?? []) as SupplierPayment[],
    error: null,
  };
}

export async function createSupplierPaymentAction(input: {
  supplier_id: string;
  purchase_id: string | null;
  amount: number;
  method: PaymentMethod;
  notes: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  const amount = Number(input.amount);

  if (!input.supplier_id) {
    return { ok: false, message: "Elige un proveedor." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "El monto debe ser mayor a 0." };
  }
  if (input.method !== "cash" && input.method !== "qr") {
    return { ok: false, message: "Método inválido (efectivo o QR)." };
  }

  const supabase = await createClient();

  if (input.purchase_id) {
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select("id, supplier_id, total_amount, status")
      .eq("id", input.purchase_id)
      .maybeSingle();

    if (purchaseError || !purchase) {
      return { ok: false, message: "Compra no encontrada." };
    }
    if (purchase.supplier_id !== input.supplier_id) {
      return { ok: false, message: "La compra no pertenece a ese proveedor." };
    }
    if (purchase.total_amount == null) {
      return {
        ok: false,
        message: "Esa compra aún no tiene precio. Fija el precio primero.",
      };
    }
  }

  const { error } = await supabase.from("supplier_payments").insert({
    supplier_id: input.supplier_id,
    purchase_id: input.purchase_id,
    amount,
    method: input.method,
    notes: input.notes.trim() || null,
    recorded_by: auth.user.id,
    paid_at: new Date().toISOString(),
  });

  if (error) return { ok: false, message: error.message };

  if (input.purchase_id) {
    const { data: payRows } = await supabase
      .from("supplier_payments")
      .select("amount, purchase_id, supplier_id")
      .eq("purchase_id", input.purchase_id);

    const { data: purchase } = await supabase
      .from("purchases")
      .select("total_amount")
      .eq("id", input.purchase_id)
      .maybeSingle();

    const paid = paidTowardPurchase(
      input.purchase_id,
      (payRows ?? []).map((p) => ({
        supplier_id: p.supplier_id as string,
        purchase_id: p.purchase_id as string | null,
        amount: Number(p.amount),
      })),
    );
    const status = statusAfterPayment(
      purchase?.total_amount == null ? null : Number(purchase.total_amount),
      paid,
    );

    await supabase
      .from("purchases")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", input.purchase_id);
  }

  revalidatePath("/pagos-proveedores");
  revalidatePath("/compras");
  revalidatePath("/proveedores");
  revalidatePath("/");
  return { ok: true, message: "Pago registrado." };
}

async function refreshPurchaseStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  purchaseId: string | null,
) {
  if (!purchaseId) return;
  const { data: payRows } = await supabase
    .from("supplier_payments")
    .select("amount, purchase_id, supplier_id")
    .eq("purchase_id", purchaseId);
  const { data: purchase } = await supabase
    .from("purchases")
    .select("total_amount")
    .eq("id", purchaseId)
    .maybeSingle();
  const paid = paidTowardPurchase(
    purchaseId,
    (payRows ?? []).map((p) => ({
      supplier_id: p.supplier_id as string,
      purchase_id: p.purchase_id as string | null,
      amount: Number(p.amount),
    })),
  );
  const status = statusAfterPayment(
    purchase?.total_amount == null ? null : Number(purchase.total_amount),
    paid,
  );
  await supabase
    .from("purchases")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", purchaseId);
}

export async function updateSupplierPaymentAction(input: {
  id: string;
  supplier_id: string;
  purchase_id: string | null;
  amount: number;
  method: PaymentMethod;
  notes: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const amount = Number(input.amount);

  if (!input.id) return { ok: false, message: "Pago inválido." };
  if (!input.supplier_id) {
    return { ok: false, message: "Elige un proveedor." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "El monto debe ser mayor a 0." };
  }
  if (input.method !== "cash" && input.method !== "qr") {
    return { ok: false, message: "Método inválido (efectivo o QR)." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("supplier_payments")
    .select("id, purchase_id")
    .eq("id", input.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, message: "Pago no encontrado." };
  }

  if (input.purchase_id) {
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select("id, supplier_id, total_amount")
      .eq("id", input.purchase_id)
      .maybeSingle();

    if (purchaseError || !purchase) {
      return { ok: false, message: "Compra no encontrada." };
    }
    if (purchase.supplier_id !== input.supplier_id) {
      return { ok: false, message: "La compra no pertenece a ese proveedor." };
    }
    if (purchase.total_amount == null) {
      return {
        ok: false,
        message: "Esa compra aún no tiene precio. Fija el precio primero.",
      };
    }
  }

  const { error } = await supabase
    .from("supplier_payments")
    .update({
      supplier_id: input.supplier_id,
      purchase_id: input.purchase_id,
      amount,
      method: input.method,
      notes: input.notes.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, message: error.message };

  const previousPurchaseId = (existing.purchase_id as string | null) ?? null;
  await refreshPurchaseStatus(supabase, previousPurchaseId);
  if (input.purchase_id !== previousPurchaseId) {
    await refreshPurchaseStatus(supabase, input.purchase_id);
  }

  revalidatePath("/pagos-proveedores");
  revalidatePath("/compras");
  revalidatePath("/proveedores");
  revalidatePath("/");
  return { ok: true, message: "Pago actualizado." };
}
