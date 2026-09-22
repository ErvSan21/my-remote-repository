"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { removeStockForConsignment } from "@/lib/inventory";
import type { ActionResult, Consignment, VentaRow } from "@/lib/data-types";
import type { ConsignmentStatus, PaymentMethod } from "@/lib/types";
import { createClientPaymentAction } from "@/app/actions/client-payments";

function revalidateVentas() {
  revalidatePath("/ventas");
  revalidatePath("/ventas/clientes");
  revalidatePath("/inventario");
  revalidatePath("/");
}

function buildVentaRows(
  consignments: Consignment[],
  payments: { consignment_id: string | null; amount: number }[],
): VentaRow[] {
  const paidByCons = new Map<string, number>();
  for (const p of payments) {
    if (!p.consignment_id) continue;
    paidByCons.set(
      p.consignment_id,
      (paidByCons.get(p.consignment_id) ?? 0) + Number(p.amount),
    );
  }

  return consignments.map((c) => {
    const paid = paidByCons.get(c.id) ?? 0;
    const total = c.total_amount == null ? null : Number(c.total_amount);
    const pending =
      total == null ? Math.max(0, 0 - paid) : Math.max(0, total - paid);
    const is_paid =
      c.status === "closed" || (total != null && pending <= 0.001 && total > 0);
    return {
      ...c,
      paid_amount: paid,
      pending_amount: is_paid ? 0 : pending,
      is_paid: Boolean(is_paid && total != null && total > 0),
    };
  });
}

export async function listVentasAction(): Promise<{
  ventas: VentaRow[];
  error: string | null;
}> {
  await requireAuth();
  const supabase = await createClient();
  const [consRes, payRes] = await Promise.all([
    supabase
      .from("consignments")
      .select("*, clients(name, zone, phone)")
      .order("left_at", { ascending: false }),
    supabase.from("client_payments").select("consignment_id, amount"),
  ]);

  if (consRes.error) {
    return { ventas: [], error: consRes.error.message };
  }
  if (payRes.error) {
    return { ventas: [], error: payRes.error.message };
  }

  const payments = (payRes.data ?? []).map((p) => ({
    consignment_id: (p.consignment_id as string | null) ?? null,
    amount: Number(p.amount),
  }));

  return {
    ventas: buildVentaRows((consRes.data ?? []) as Consignment[], payments),
    error: null,
  };
}

export async function listConsignmentsAction(): Promise<{
  consignments: Consignment[];
  error: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consignments")
    .select("*, clients(name, zone, phone)")
    .order("left_at", { ascending: false });
  if (error) return { consignments: [], error: error.message };
  return { consignments: (data ?? []) as Consignment[], error: null };
}

export async function listOpenConsignmentsAction(): Promise<{
  consignments: Consignment[];
  error: string | null;
}> {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consignments")
    .select("*, clients(name, zone, phone)")
    .in("status", ["open", "partial"])
    .order("left_at", { ascending: false });
  if (error) return { consignments: [], error: error.message };
  return { consignments: (data ?? []) as Consignment[], error: null };
}

export async function createConsignmentAction(input: {
  client_id: string;
  quantity_birds: number;
  unit_price: number | null;
  notes: string;
  /** Si true y hay total, registra cobro completo al contado. */
  pay_in_full?: boolean;
  pay_method?: PaymentMethod;
}): Promise<ActionResult & { consignmentId?: string }> {
  const auth = await requireAdmin();
  const qty = Number(input.quantity_birds);
  if (!input.client_id) return { ok: false, message: "Elige un cliente." };
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, message: "Cantidad de aves inválida." };
  }

  const unitPrice =
    input.unit_price == null || Number.isNaN(Number(input.unit_price))
      ? null
      : Number(input.unit_price);
  const total =
    unitPrice == null ? null : Math.round(qty * unitPrice * 100) / 100;

  if (input.pay_in_full && (total == null || total <= 0)) {
    return {
      ok: false,
      message: "Para venta al contado indica precio unitario.",
    };
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("consignments")
    .insert({
      client_id: input.client_id,
      quantity_birds: qty,
      unit_price: unitPrice,
      total_amount: total,
      status: "open" as ConsignmentStatus,
      notes: input.notes.trim() || null,
      created_by: auth.user.id,
      left_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, message: error?.message || "No se creó la venta." };
  }

  const stock = await removeStockForConsignment(row.id, qty, auth.user.id);
  if (!stock.ok) {
    await supabase.from("consignments").delete().eq("id", row.id);
    return { ok: false, message: stock.message };
  }

  if (input.pay_in_full && total != null && total > 0) {
    const pay = await createClientPaymentAction({
      client_id: input.client_id,
      consignment_id: row.id,
      amount: total,
      method: input.pay_method ?? "cash",
      notes: "Pago al contado",
    });
    if (!pay.ok) {
      revalidateVentas();
      return {
        ok: false,
        message: `Venta creada pero falló el cobro: ${pay.message}`,
        consignmentId: row.id,
      };
    }
    revalidateVentas();
    return {
      ok: true,
      message: "Venta al contado registrada.",
      consignmentId: row.id,
    };
  }

  revalidateVentas();
  return {
    ok: true,
    message: "Venta a crédito registrada. Stock descontado.",
    consignmentId: row.id,
  };
}

export async function updateConsignmentPriceAction(input: {
  id: string;
  unit_price: number;
}): Promise<ActionResult> {
  await requireAdmin();
  const price = Number(input.unit_price);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, message: "Precio inválido." };
  }
  const supabase = await createClient();
  const { data: cons, error: fetchError } = await supabase
    .from("consignments")
    .select("quantity_birds, status")
    .eq("id", input.id)
    .maybeSingle();
  if (fetchError || !cons) {
    return { ok: false, message: "Venta no encontrada." };
  }
  const total = Math.round(Number(cons.quantity_birds) * price * 100) / 100;
  const { error } = await supabase
    .from("consignments")
    .update({
      unit_price: price,
      total_amount: total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };
  revalidateVentas();
  return { ok: true, message: "Precio actualizado." };
}

export async function updateConsignmentAction(input: {
  id: string;
  client_id: string;
  unit_price: number | null;
  notes: string;
}): Promise<ActionResult> {
  await requireAdmin();
  if (!input.id) return { ok: false, message: "Venta inválida." };
  if (!input.client_id) return { ok: false, message: "Elige un cliente." };

  const unitPrice =
    input.unit_price == null || Number.isNaN(Number(input.unit_price))
      ? null
      : Number(input.unit_price);
  if (unitPrice != null && unitPrice < 0) {
    return { ok: false, message: "Precio inválido." };
  }

  const supabase = await createClient();
  const { data: cons, error: fetchError } = await supabase
    .from("consignments")
    .select("quantity_birds")
    .eq("id", input.id)
    .maybeSingle();
  if (fetchError || !cons) {
    return { ok: false, message: "Venta no encontrada." };
  }

  const total =
    unitPrice == null
      ? null
      : Math.round(Number(cons.quantity_birds) * unitPrice * 100) / 100;

  const { error } = await supabase
    .from("consignments")
    .update({
      client_id: input.client_id,
      unit_price: unitPrice,
      total_amount: total,
      notes: input.notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { ok: false, message: error.message };
  revalidateVentas();
  return { ok: true, message: "Venta actualizada." };
}
