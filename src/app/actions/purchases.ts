"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { paidTowardPurchase, statusAfterPayment } from "@/lib/debts";
import type { ActionResult, Purchase } from "@/lib/data-types";
import type { PurchaseStatus } from "@/lib/types";

export async function listPurchasesAction(): Promise<{
  purchases: Purchase[];
  error: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("*, suppliers(name)")
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { purchases: [], error: error.message };
  return { purchases: (data ?? []) as Purchase[], error: null };
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
  const qty = Number(input.quantity_birds);
  if (!input.supplier_id) {
    return { ok: false, message: "Elige un proveedor." };
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, message: "La cantidad de aves debe ser mayor a 0." };
  }

  const amounts = resolveAmounts(qty, input.unit_price);
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
      notes: input.notes.trim() || null,
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
    return {
      ok: false,
      message: `Compra creada pero falló el inventario: ${stock.message}`,
    };
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
  await requireAdmin();
  const qty = Number(input.quantity_birds);
  if (!input.id) return { ok: false, message: "Compra inválida." };
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, message: "La cantidad de aves debe ser mayor a 0." };
  }

  const amounts = resolveAmounts(qty, input.unit_price);
  const supabase = await createClient();

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
      notes: input.notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/compras");
  revalidatePath("/pagos-proveedores");
  revalidatePath("/proveedores");
  revalidatePath("/");
  return { ok: true, message: "Compra actualizada." };
}
