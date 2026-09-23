"use server";

import { revalidatePath } from "next/cache";
import { isAdminRole, requireAdmin, requireAuth, requireSuperadmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { removeStockForConsignment } from "@/lib/inventory";
import { tryRpc } from "@/lib/status-refresh";
import {
  boundedText,
  isUuid,
  parseMoney,
  parsePositiveInt,
} from "@/lib/validation";
import {
  consignmentStatusForBalance,
  ventaBalance,
} from "@/lib/debts";
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
  revalidatePath("/clientes");
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
    const balance = ventaBalance(total, paid);
    return {
      ...c,
      creator: profileDisplay(c.creator),
      paid_amount: balance.paid_amount,
      pending_amount: balance.pending_amount,
      is_paid: balance.is_paid,
      payments: salePayments,
    };
  });
}

const CONS_COLS =
  "id, client_id, quantity_birds, unit_price, total_amount, status, left_at, created_at, created_by, sale_number, notes";
const CONS_SELECT_FULL = `${CONS_COLS}, clients(name, zone, phone), creator:profiles!consignments_created_by_fkey(email, username, full_name)`;
const CONS_SELECT_BASIC = `${CONS_COLS}, clients(name, zone, phone)`;
const PAY_SELECT_LIST =
  "id, consignment_id, amount, method, paid_at, recorded_by";
const PAY_SELECT_DETAIL = `${PAY_SELECT_LIST}, recorder:profiles!client_payments_recorded_by_fkey(email, username, full_name)`;

function labelToProfile(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { full_name?: string | null; username?: string | null };
  return {
    email: null,
    username: row.username ?? null,
    full_name: row.full_name ?? null,
  };
}

async function attachProfileLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ventas: VentaRow[],
): Promise<VentaRow[]> {
  const ids = new Set<string>();
  for (const venta of ventas) {
    if (venta.created_by && !venta.creator) ids.add(venta.created_by);
    for (const payment of venta.payments) {
      if (payment.recorded_by && !payment.recorder) ids.add(payment.recorded_by);
    }
  }
  if (ids.size === 0) return ventas;

  const { data, error } = await supabase
    .from("profile_labels")
    .select("id, full_name, username")
    .in("id", [...ids]);
  if (error || !data) return ventas;

  const byId = new Map(data.map((row) => [row.id as string, row]));
  return ventas.map((venta) => ({
    ...venta,
    creator:
      venta.creator ??
      labelToProfile(venta.created_by ? byId.get(venta.created_by) : undefined),
    payments: venta.payments.map((payment) => ({
      ...payment,
      recorder:
        payment.recorder ??
        labelToProfile(
          payment.recorded_by ? byId.get(payment.recorded_by) : undefined,
        ),
    })),
  }));
}

function mapPaymentRows(payData: Array<Record<string, unknown>>) {
  return payData.map((p) => ({
    id: p.id as string,
    consignment_id: (p.consignment_id as string | null) ?? null,
    amount: Number(p.amount),
    method: p.method as import("@/lib/types").PaymentMethod,
    paid_at: p.paid_at as string,
    recorded_by: (p.recorded_by as string | null) ?? null,
    recorder: p.recorder ?? null,
  }));
}

export async function listVentasAction(): Promise<{
  ventas: VentaRow[];
  error: string | null;
}> {
  await requireAuth();
  const supabase = await createClient();

  // List view needs amounts, not payment recorder profiles.
  const [consJoined, payRes] = await Promise.all([
    supabase
      .from("consignments")
      .select(CONS_SELECT_BASIC)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_payments")
      .select(PAY_SELECT_LIST)
      .not("consignment_id", "is", null)
      .order("paid_at", { ascending: false }),
  ]);

  let consData: unknown[] | null = consJoined.data as unknown[] | null;
  let consError = consJoined.error?.message ?? null;

  // If join fails (schema), retry consignments without client join once.
  if (consJoined.error) {
    const plain = await supabase
      .from("consignments")
      .select(CONS_COLS)
      .order("created_at", { ascending: false });
    consData = plain.data as unknown[] | null;
    consError = plain.error?.message ?? null;
  }

  if (consError) {
    return { ventas: [], error: consError };
  }
  if (payRes.error) {
    return { ventas: [], error: payRes.error.message };
  }

  return {
    ventas: buildVentaRows(
      (consData ?? []) as Consignment[],
      mapPaymentRows((payRes.data ?? []) as Array<Record<string, unknown>>),
    ),
    error: null,
  };
}

export async function getVentaAction(id: string): Promise<{
  venta: VentaRow | null;
  error: string | null;
}> {
  const auth = await requireAuth();
  if (!isUuid(id)) return { venta: null, error: "Venta no encontrada." };

  const supabase = await createClient();
  const adminView = isAdminRole(auth.profile.role);
  const consSelect = adminView ? CONS_SELECT_FULL : CONS_SELECT_BASIC;
  const paySelect = adminView ? PAY_SELECT_DETAIL : PAY_SELECT_LIST;

  const [consFull, payFull] = await Promise.all([
    supabase
      .from("consignments")
      .select(consSelect)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("client_payments")
      .select(paySelect)
      .eq("consignment_id", id)
      .order("paid_at", { ascending: false }),
  ]);

  let consRow: unknown = consFull.data;
  let consError = consFull.error?.message ?? null;
  if (consFull.error) {
    const basic = await supabase
      .from("consignments")
      .select(CONS_SELECT_BASIC)
      .eq("id", id)
      .maybeSingle();
    consRow = basic.data;
    consError = basic.error?.message ?? null;
  }

  let payData: Array<Record<string, unknown>> =
    (payFull.data as Array<Record<string, unknown>> | null) ?? [];
  let payError = payFull.error?.message ?? null;
  if (payFull.error) {
    const basicPay = await supabase
      .from("client_payments")
      .select(PAY_SELECT_LIST)
      .eq("consignment_id", id)
      .order("paid_at", { ascending: false });
    payData = (basicPay.data as Array<Record<string, unknown>> | null) ?? [];
    payError = basicPay.error?.message ?? null;
  }

  if (consError) return { venta: null, error: consError };
  if (!consRow) return { venta: null, error: "Venta no encontrada." };
  if (payError) return { venta: null, error: payError };

  const rows = await attachProfileLabels(
    supabase,
    buildVentaRows([consRow as Consignment], mapPaymentRows(payData)),
  );
  return { venta: rows[0] ?? null, error: null };
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
  const qty = parsePositiveInt(input.quantity_birds);
  const notes = boundedText(input.notes);
  if (!isUuid(input.client_id)) return { ok: false, message: "Elige un cliente." };
  if (qty == null) {
    return { ok: false, message: "La cantidad debe ser un entero mayor a 0." };
  }
  if (!notes.ok) return { ok: false, message: "La nota es demasiado larga." };

  const unitPrice = parseMoney(input.unit_price);
  if (unitPrice == null) {
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
      notes: notes.value || null,
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
    const removed = await tryRpc(supabase, "delete_consignment_if_unpaid", {
      p_id: row.id,
    });
    if (removed === "missing") {
      await supabase.from("consignments").delete().eq("id", row.id);
    }
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

async function consignmentStatusFromPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  consignmentId: string,
  total: number,
) {
  const { data: pays, error } = await supabase
    .from("client_payments")
    .select("amount")
    .eq("consignment_id", consignmentId);
  if (error) return { error: error.message, status: null };
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  return {
    error: null,
    status: consignmentStatusForBalance(total, paid),
  };
}

export async function updateConsignmentPriceAction(input: {
  id: string;
  unit_price: number;
}): Promise<ActionResult> {
  await requireSuperadmin();
  const price = parseMoney(input.unit_price);
  if (!isUuid(input.id) || price == null) {
    return { ok: false, message: "El precio unitario es obligatorio." };
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
  const statusResult = await consignmentStatusFromPayments(
    supabase,
    input.id,
    total,
  );
  if (statusResult.error || !statusResult.status) {
    return {
      ok: false,
      message: statusResult.error || "No se pudo recalcular el saldo.",
    };
  }
  const { error } = await supabase
    .from("consignments")
    .update({
      unit_price: price,
      total_amount: total,
      status: statusResult.status,
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
  const notes = boundedText(input.notes);
  if (!isUuid(input.id)) return { ok: false, message: "Venta inválida." };
  if (!isUuid(input.client_id)) return { ok: false, message: "Elige un cliente." };
  if (!notes.ok) return { ok: false, message: "La nota es demasiado larga." };

  const unitPrice = parseMoney(input.unit_price);
  if (unitPrice == null) {
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
  const statusResult = await consignmentStatusFromPayments(
    supabase,
    input.id,
    total,
  );
  if (statusResult.error || !statusResult.status) {
    return {
      ok: false,
      message: statusResult.error || "No se pudo recalcular el saldo.",
    };
  }

  const { error } = await supabase
    .from("consignments")
    .update({
      client_id: input.client_id,
      unit_price: unitPrice,
      total_amount: total,
      status: statusResult.status,
      notes: notes.value || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { ok: false, message: error.message };
  revalidateVentas(input.id);
  return { ok: true, message: "Venta actualizada." };
}
