"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAuth, requireSuperadmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { removeStockForConsignment } from "@/lib/inventory";
import type {
  ActionResult,
  Consignment,
  VentaPayment,
  VentaRow,
} from "@/lib/data-types";
import type { ConsignmentStatus, PaymentMethod } from "@/lib/types";
import { createClientPaymentAction } from "@/app/actions/client-payments";

function revalidateVentas(ventaId?: string) {
  revalidatePath("/ventas");
  revalidatePath("/ventas/clientes");
  revalidatePath("/inventario");
  revalidatePath("/");
  if (ventaId) {
    revalidatePath(`/ventas/${ventaId}`);
    revalidatePath(`/ventas/${ventaId}/editar`);
  }
}

function profileDisplay(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as {
    email?: string | null;
    username?: string | null;
    full_name?: string | null;
  };
  return {
    email: p.email ?? null,
    username: p.username ?? null,
    full_name: p.full_name ?? null,
  };
}

function buildVentaRows(
  consignments: Consignment[],
  payments: Array<{
    id: string;
    consignment_id: string | null;
    amount: number;
    method: import("@/lib/types").PaymentMethod;
    paid_at: string;
    recorded_by: string | null;
    recorder?: unknown;
  }>,
): VentaRow[] {
  const paymentsByCons = new Map<string, VentaPayment[]>();
  for (const p of payments) {
    if (!p.consignment_id) continue;
    const row: VentaPayment = {
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paid_at: p.paid_at,
      recorded_by: p.recorded_by,
      recorder: profileDisplay(p.recorder),
    };
    const list = paymentsByCons.get(p.consignment_id) ?? [];
    list.push(row);
    paymentsByCons.set(p.consignment_id, list);
  }

  return consignments.map((c) => {
    const salePayments = (paymentsByCons.get(c.id) ?? []).sort((a, b) =>
      a.paid_at < b.paid_at ? 1 : -1,
    );
    const paid = salePayments.reduce((s, p) => s + p.amount, 0);
    const total = c.total_amount == null ? null : Number(c.total_amount);
    const pending =
      total == null ? Math.max(0, 0 - paid) : Math.max(0, total - paid);
    const is_paid =
      c.status === "closed" || (total != null && pending <= 0.001 && total > 0);
    return {
      ...c,
      creator: profileDisplay(c.creator),
      paid_amount: paid,
      pending_amount: is_paid ? 0 : pending,
      is_paid: Boolean(is_paid && total != null && total > 0),
      payments: salePayments,
    };
  });
}

export async function listVentasAction(): Promise<{
  ventas: VentaRow[];
  error: string | null;
}> {
  await requireAuth();
  const supabase = await createClient();

  const consSelectFull =
    "*, clients(name, zone, phone), creator:profiles!consignments_created_by_fkey(email, username, full_name)";
  const consSelectBasic = "*, clients(name, zone, phone)";
  const paySelectFull =
    "id, consignment_id, amount, method, paid_at, recorded_by, recorder:profiles!client_payments_recorded_by_fkey(email, username, full_name)";
  const paySelectBasic =
    "id, consignment_id, amount, method, paid_at, recorded_by";

  let consData: unknown[] | null = null;
  let consError: string | null = null;
  {
    const full = await supabase
      .from("consignments")
      .select(consSelectFull)
      .order("created_at", { ascending: false });
    if (!full.error) {
      consData = full.data ?? [];
    } else {
      const basic = await supabase
        .from("consignments")
        .select(consSelectBasic)
        .order("created_at", { ascending: false });
      if (basic.error) consError = basic.error.message;
      else consData = basic.data ?? [];
    }
  }

  let payData: Array<Record<string, unknown>> | null = null;
  let payError: string | null = null;
  {
    const full = await supabase
      .from("client_payments")
      .select(paySelectFull)
      .order("paid_at", { ascending: false });
    if (!full.error) {
      payData = (full.data ?? []) as Array<Record<string, unknown>>;
    } else {
      const basic = await supabase
        .from("client_payments")
        .select(paySelectBasic)
        .order("paid_at", { ascending: false });
      if (basic.error) payError = basic.error.message;
      else payData = (basic.data ?? []) as Array<Record<string, unknown>>;
    }
  }

  if (consError) {
    return { ventas: [], error: consError };
  }
  if (payError) {
    return { ventas: [], error: payError };
  }

  const payments = (payData ?? []).map((p) => ({
    id: p.id as string,
    consignment_id: (p.consignment_id as string | null) ?? null,
    amount: Number(p.amount),
    method: p.method as import("@/lib/types").PaymentMethod,
    paid_at: p.paid_at as string,
    recorded_by: (p.recorded_by as string | null) ?? null,
    recorder: p.recorder ?? null,
  }));

  return {
    ventas: buildVentaRows((consData ?? []) as Consignment[], payments),
    error: null,
  };
}

export async function getVentaAction(id: string): Promise<{
  venta: VentaRow | null;
  error: string | null;
}> {
  await requireAuth();
  if (!id) return { venta: null, error: "Venta inválida." };

  const { ventas, error } = await listVentasAction();
  if (error) return { venta: null, error };
  const venta = ventas.find((v) => v.id === id) ?? null;
  if (!venta) return { venta: null, error: "Venta no encontrada." };
  return { venta, error: null };
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
    return { ok: false, message: "Cantidad inválida." };
  }

  const unitPrice = Number(input.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { ok: false, message: "El precio unitario es obligatorio." };
  }
  const total = Math.round(qty * unitPrice * 100) / 100;

  if (input.pay_in_full && total <= 0) {
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

  if (input.pay_in_full && total > 0) {
    const pay = await createClientPaymentAction({
      client_id: input.client_id,
      consignment_id: row.id,
      amount: total,
      method: input.pay_method ?? "cash",
      notes: "Pago al contado",
    });
    if (!pay.ok) {
      revalidateVentas(row.id);
      return {
        ok: false,
        message: `Venta creada pero falló el cobro: ${pay.message}`,
        consignmentId: row.id,
      };
    }
    revalidateVentas(row.id);
    return {
      ok: true,
      message: "Venta al contado registrada.",
      consignmentId: row.id,
    };
  }

  revalidateVentas(row.id);
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
  await requireSuperadmin();
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
  revalidateVentas(input.id);
  return { ok: true, message: "Precio actualizado." };
}

export async function updateConsignmentAction(input: {
  id: string;
  client_id: string;
  unit_price: number | null;
  notes: string;
}): Promise<ActionResult> {
  await requireSuperadmin();
  if (!input.id) return { ok: false, message: "Venta inválida." };
  if (!input.client_id) return { ok: false, message: "Elige un cliente." };

  const unitPrice = Number(input.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { ok: false, message: "El precio unitario es obligatorio." };
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

  const total = Math.round(Number(cons.quantity_birds) * unitPrice * 100) / 100;

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
  revalidateVentas(input.id);
  return { ok: true, message: "Venta actualizada." };
}
