"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperadmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { boundedText, isIsoDate, isUuid, parseMoney, parsePositiveInt } from "@/lib/validation";
import { paidTowardPurchase, purchaseBalance, statusAfterPayment } from "@/lib/debts";
import type { ActionResult, Purchase } from "@/lib/data-types";
import type { PurchaseStatus } from "@/lib/types";

const PURCHASE_SELECT =
  "id, supplier_id, purchase_date, quantity_birds, unit_price, total_amount, status, notes, created_at, suppliers(name, phone)";

export async function listPurchasesAction(): Promise<{
  purchases: Purchase[];
  error: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();
  const [purchasesRes, paymentsRes] = await Promise.all([
    supabase
      .from("purchases")
      .select(PURCHASE_SELECT)
      .order("created_at", { ascending: false }),
    supabase.from("supplier_payments").select("purchase_id, amount"),
  ]);

  if (purchasesRes.error) {
    return { purchases: [], error: purchasesRes.error.message };
  }
  if (paymentsRes.error) {
    return { purchases: [], error: paymentsRes.error.message };
  }
  return {
    purchases: withPaidAmounts(
      (purchasesRes.data ?? []) as unknown as Purchase[],
      paymentsRes.data ?? [],
    ),
    error: null,
  };
}

export async function getPurchaseAction(id: string): Promise<{
  purchase: Purchase | null;
  error: string | null;
}> {
  await requireAdmin();
  if (!isUuid(id)) return { purchase: null, error: "Compra no encontrada." };
  const supabase = await createClient();
  const [purchaseRes, paymentsRes] = await Promise.all([
    supabase.from("purchases").select(PURCHASE_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("supplier_payments")
      .select("purchase_id, amount")
      .eq("purchase_id", id),
  ]);
  if (purchaseRes.error) return { purchase: null, error: purchaseRes.error.message };
  if (paymentsRes.error) return { purchase: null, error: paymentsRes.error.message };
  if (!purchaseRes.data) return { purchase: null, error: "Compra no encontrada." };
  const [purchase] = withPaidAmounts(
    [purchaseRes.data as unknown as Purchase],
    paymentsRes.data ?? [],
  );
  return { purchase, error: null };
}

function withPaidAmounts(
  purchases: Purchase[],
  payments: { purchase_id: string | null; amount: number | null }[],
): Purchase[] {
  const paidById = new Map<string, number>();
  for (const payment of payments) {
    if (!payment.purchase_id) continue;
    const prev = paidById.get(payment.purchase_id) ?? 0;
    paidById.set(payment.purchase_id, prev + Number(payment.amount ?? 0));
  }
  return purchases.map((purchase) => {
    const balance = purchaseBalance(
      purchase.total_amount,
      paidById.get(purchase.id) ?? 0,
    );
    return { ...purchase, paid_amount: balance.paid_amount };
  });
}

function resolveAmounts(quantity: number, unitPrice: number | null) {
  if (unitPrice == null || Number.isNaN(unitPrice)) {
    return {
      unit_price: null as number | null,
      total_amount: null as number | null,
      status: "pending_price" as PurchaseStatus,
    };
  }
  const total = Math.round(quantity * unitPrice * 100) / 100;
  return {
    unit_price: unitPrice,
    total_amount: total,
    status: "priced" as PurchaseStatus,
  };
}

export async function createPurchaseAction(input: {
  supplier_id: string;
  purchase_date: string;
  quantity_birds: number;
  unit_price: number | null;
  notes: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  const qty = parsePositiveInt(input.quantity_birds);
  const notes = boundedText(input.notes);
  if (!isUuid(input.supplier_id)) {
    return { ok: false, message: "Elige un proveedor." };
  }
  if (qty == null) {
    return {
      ok: false,
      message: "La cantidad de aves debe ser un entero mayor a 0.",
    };
  }
  if (!notes.ok) return { ok: false, message: "La nota es demasiado larga." };
  if (input.purchase_date && !isIsoDate(input.purchase_date)) {
    return { ok: false, message: "Fecha inválida." };
  }
  if (input.unit_price != null && parseMoney(input.unit_price) == null) {
    return { ok: false, message: "Precio inválido." };
  }

  const amounts = resolveAmounts(qty, input.unit_price == null ? null : parseMoney(input.unit_price));
  const supabase = await createClient();
  const { data: purchase, error } = await supabase
    .from("purchases")
    .insert({
      supplier_id: input.supplier_id,
      purchase_date: input.purchase_date || new Date().toISOString().slice(0, 10),
      quantity_birds: qty,
      unit_price: amounts.unit_price,
      total_amount: amounts.total_amount,
      status: amounts.status,
      notes: notes.value || null,
      created_by: auth.user.id,
    })
    .select("id")
    .single();

  if (error || !purchase) {
    return { ok: false, message: error?.message || "No se creó la compra." };
  }

  const { addStockFromPurchase } = await import("@/lib/inventory");
  const stock = await addStockFromPurchase(
    purchase.id,
    qty,
    auth.user.id,
    `Compra ${input.purchase_date}`,
  );
  if (!stock.ok) {
    await supabase
      .from("inventory_movements")
      .delete()
      .eq("ref_purchase_id", purchase.id);
    await supabase
      .from("inventory_lots")
      .delete()
      .eq("source_purchase_id", purchase.id);
    const { error: delError } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchase.id);
    const extra = delError
      ? ` Además no se pudo deshacer la compra: ${delError.message}`
      : "";
    return { ok: false, message: `${stock.message}${extra}` };
  }

  revalidatePath("/compras");
  revalidatePath("/pagos-proveedores");
  revalidatePath("/proveedores");
  revalidatePath("/inventario");
  revalidatePath("/");
  return {
    ok: true,
    message:
      amounts.status === "pending_price"
        ? "Compra registrada (precio pendiente). Stock actualizado."
        : "Compra registrada. Stock actualizado.",
  };
}

export async function updatePurchaseAction(input: {
  id: string;
  supplier_id: string;
  purchase_date: string;
  quantity_birds: number;
  unit_price: number | null;
  notes: string;
}): Promise<ActionResult> {
  const auth = await requireSuperadmin();
  const qty = parsePositiveInt(input.quantity_birds);
  const notes = boundedText(input.notes);
  if (!isUuid(input.id)) return { ok: false, message: "Compra inválida." };
  if (!isUuid(input.supplier_id)) return { ok: false, message: "Elige un proveedor." };
  if (qty == null) {
    return {
      ok: false,
      message: "La cantidad debe ser un entero mayor a 0.",
    };
  }
  if (!notes.ok) return { ok: false, message: "La nota es demasiado larga." };
  if (!isIsoDate(input.purchase_date)) {
    return { ok: false, message: "Fecha inválida." };
  }
  if (input.unit_price != null && parseMoney(input.unit_price) == null) {
    return { ok: false, message: "Precio inválido." };
  }

  const amounts = resolveAmounts(qty, input.unit_price == null ? null : parseMoney(input.unit_price));
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("purchases")
    .select("quantity_birds")
    .eq("id", input.id)
    .maybeSingle();
  if (currentError || !current) {
    return { ok: false, message: "Compra no encontrada." };
  }
  const previousQty = Number(current.quantity_birds);

  let stockAdjusted = false;
  if (qty !== previousQty) {
    const { adjustStockForPurchaseQtyChange } = await import("@/lib/inventory");
    const stock = await adjustStockForPurchaseQtyChange(
      input.id,
      previousQty,
      qty,
      auth.user.id,
    );
    if (!stock.ok) return { ok: false, message: stock.message };
    stockAdjusted = true;
  }

  // Recalcular estado según pagos ya hechos si hay precio
  let status = amounts.status;
  if (amounts.total_amount != null) {
    const { data: payments } = await supabase
      .from("supplier_payments")
      .select("amount, purchase_id, supplier_id")
      .eq("purchase_id", input.id);
    const paid = paidTowardPurchase(
      input.id,
      (payments ?? []).map((p) => ({
        supplier_id: p.supplier_id as string,
        purchase_id: p.purchase_id as string | null,
        amount: Number(p.amount),
      })),
    );
    status = statusAfterPayment(amounts.total_amount, paid);
  }

  const { error } = await supabase
    .from("purchases")
    .update({
      supplier_id: input.supplier_id,
      purchase_date: input.purchase_date,
      quantity_birds: qty,
      unit_price: amounts.unit_price,
      total_amount: amounts.total_amount,
      status,
      notes: notes.value || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    if (stockAdjusted) {
      const { adjustStockForPurchaseQtyChange } = await import(
        "@/lib/inventory"
      );
      await adjustStockForPurchaseQtyChange(
        input.id,
        qty,
        previousQty,
        auth.user.id,
      );
    }
    return { ok: false, message: error.message };
  }
  revalidatePath("/compras");
  revalidatePath(`/compras/${input.id}`);
  revalidatePath(`/compras/${input.id}/editar`);
  revalidatePath("/pagos-proveedores");
  revalidatePath("/proveedores");
  revalidatePath("/inventario");
  revalidatePath("/");
  return { ok: true, message: "Compra actualizada." };
}
