"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { tryRpc } from "@/lib/status-refresh";
import { boundedText, isUuid, parseMoney } from "@/lib/validation";
import { consignmentStatusForBalance, paymentExceedsBalance } from "@/lib/debts";
import type { ActionResult, ClientPayment } from "@/lib/data-types";
import type { PaymentMethod } from "@/lib/types";

function fallbackReceiptCode() {
  const d = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  }).replace(/-/g, "");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `RCP-${d}-${rand}`;
}

async function nextReceiptCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase.rpc("generate_receipt_code");
  if (!error && typeof data === "string" && data.length > 0) return data;
  return fallbackReceiptCode();
}

function statusAfterClientPay(total: number | null, paid: number) {
  return consignmentStatusForBalance(total, paid);
}

export async function listClientPaymentsAction(): Promise<{
  payments: ClientPayment[];
  error: string | null;
}> {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_payments")
    .select("*, clients(name), receipts(id, code)")
    .order("paid_at", { ascending: false })
    .limit(50);
  if (error) return { payments: [], error: error.message };
  return { payments: (data ?? []) as ClientPayment[], error: null };
}

export type CreateClientPaymentResult = ActionResult & {
  receiptId?: string;
  receiptCode?: string;
  paymentId?: string;
  paidAt?: string;
};

export async function createClientPaymentAction(input: {
  client_id: string;
  consignment_id: string | null;
  amount: number;
  method: PaymentMethod;
  notes: string;
}): Promise<CreateClientPaymentResult> {
  const auth = await requireAuth();
  const amount = parseMoney(input.amount);
  const notes = boundedText(input.notes);

  if (!isUuid(input.client_id)) return { ok: false, message: "Elige un cliente." };
  if (input.consignment_id && !isUuid(input.consignment_id)) {
    return { ok: false, message: "Consignación inválida." };
  }
  if (amount == null) {
    return { ok: false, message: "El monto debe ser mayor a 0." };
  }
  if (!notes.ok) return { ok: false, message: "La nota es demasiado larga." };
  if (input.method !== "cash" && input.method !== "qr") {
    return { ok: false, message: "Método inválido." };
  }

  const supabase = await createClient();

  if (input.consignment_id) {
    const { data: cons, error } = await supabase
      .from("consignments")
      .select("id, client_id, total_amount, status")
      .eq("id", input.consignment_id)
      .maybeSingle();
    if (error || !cons) {
      return { ok: false, message: "Consignación no encontrada." };
    }
    if (cons.client_id !== input.client_id) {
      return { ok: false, message: "La consignación no es de ese cliente." };
    }
    if (cons.total_amount != null) {
      const { data: pays, error: paidError } = await supabase
        .from("client_payments")
        .select("amount")
        .eq("consignment_id", input.consignment_id);
      if (paidError) return { ok: false, message: paidError.message };
      const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
      if (paymentExceedsBalance(Number(cons.total_amount), paid, amount)) {
        return {
          ok: false,
          message: "El monto supera el saldo pendiente de la venta.",
        };
      }
    }
  }

  const paidAt = new Date().toISOString();
  const { data: payment, error: payError } = await supabase
    .from("client_payments")
    .insert({
      client_id: input.client_id,
      consignment_id: input.consignment_id,
      amount,
      method: input.method,
      notes: notes.value || null,
      recorded_by: auth.user.id,
      paid_at: paidAt,
    })
    .select("id")
    .single();

  if (payError || !payment) {
    return { ok: false, message: payError?.message || "No se registró el cobro." };
  }

  const code = await nextReceiptCode(supabase);
  const { data: receipt, error: recError } = await supabase
    .from("receipts")
    .insert({
      client_payment_id: payment.id,
      code,
      issued_by: auth.user.id,
      issued_at: new Date().toISOString(),
    })
    .select("id, code")
    .single();

  if (recError || !receipt) {
    await supabase.from("client_payments").delete().eq("id", payment.id);
    return {
      ok: false,
      message:
        recError?.message ||
        "No se pudo emitir el recibo. El cobro no quedó registrado.",
    };
  }

  if (input.consignment_id) {
    const { data: pays } = await supabase
      .from("client_payments")
      .select("amount")
      .eq("consignment_id", input.consignment_id);
    const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const { data: cons } = await supabase
      .from("consignments")
      .select("total_amount")
      .eq("id", input.consignment_id)
      .maybeSingle();
    const status = statusAfterClientPay(
      cons?.total_amount == null ? null : Number(cons.total_amount),
      paid,
    );
    await supabase
      .from("consignments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", input.consignment_id);
  }

  revalidatePath("/ventas");
  if (input.consignment_id) revalidatePath(`/ventas/${input.consignment_id}`);
  revalidatePath("/clientes");
  revalidatePath("/recibos");
  revalidatePath("/");
  return {
    ok: true,
    message: `Cobro registrado. Recibo ${receipt.code}`,
    receiptId: receipt.id,
    receiptCode: receipt.code,
    paymentId: payment.id,
    paidAt,
  };
}

async function refreshConsignmentStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  consignmentId: string | null,
) {
  if (!consignmentId) return;
  const rpc = await tryRpc(supabase, "refresh_consignment_payment_status", {
    p_consignment_id: consignmentId,
  });
  if (rpc !== "missing") return;

  const { data: pays } = await supabase
    .from("client_payments")
    .select("amount")
    .eq("consignment_id", consignmentId);
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const { data: cons } = await supabase
    .from("consignments")
    .select("total_amount")
    .eq("id", consignmentId)
    .maybeSingle();
  const status = statusAfterClientPay(
    cons?.total_amount == null ? null : Number(cons.total_amount),
    paid,
  );
  await supabase
    .from("consignments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", consignmentId);
}

export async function updateClientPaymentAction(input: {
  id: string;
  client_id: string;
  consignment_id: string | null;
  amount: number;
  method: PaymentMethod;
  notes: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const amount = parseMoney(input.amount);
  const notes = boundedText(input.notes);

  if (!isUuid(input.id)) return { ok: false, message: "Cobro inválido." };
  if (!isUuid(input.client_id)) return { ok: false, message: "Elige un cliente." };
  if (input.consignment_id && !isUuid(input.consignment_id)) {
    return { ok: false, message: "Consignación inválida." };
  }
  if (amount == null) {
    return { ok: false, message: "El monto debe ser mayor a 0." };
  }
  if (!notes.ok) return { ok: false, message: "La nota es demasiado larga." };
  if (input.method !== "cash" && input.method !== "qr") {
    return { ok: false, message: "Método inválido." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("client_payments")
    .select("id, consignment_id")
    .eq("id", input.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, message: "Cobro no encontrado." };
  }

  if (input.consignment_id) {
    const { data: cons, error } = await supabase
      .from("consignments")
      .select("id, client_id, total_amount")
      .eq("id", input.consignment_id)
      .maybeSingle();
    if (error || !cons) {
      return { ok: false, message: "Consignación no encontrada." };
    }
    if (cons.client_id !== input.client_id) {
      return { ok: false, message: "La consignación no es de ese cliente." };
    }
    if (cons.total_amount != null) {
      const { data: pays, error: paidError } = await supabase
        .from("client_payments")
        .select("id, amount")
        .eq("consignment_id", input.consignment_id);
      if (paidError) return { ok: false, message: paidError.message };
      const paid = (pays ?? [])
        .filter((p) => p.id !== input.id)
        .reduce((s, p) => s + Number(p.amount), 0);
      if (paymentExceedsBalance(Number(cons.total_amount), paid, amount)) {
        return {
          ok: false,
          message: "El monto supera el saldo pendiente de la venta.",
        };
      }
    }
  }

  const { error } = await supabase
    .from("client_payments")
    .update({
      client_id: input.client_id,
      consignment_id: input.consignment_id,
      amount,
      method: input.method,
      notes: notes.value || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, message: error.message };

  const previousConsId = (existing.consignment_id as string | null) ?? null;
  await refreshConsignmentStatus(supabase, previousConsId);
  if (input.consignment_id !== previousConsId) {
    await refreshConsignmentStatus(supabase, input.consignment_id);
  }

  revalidatePath("/ventas");
  revalidatePath("/clientes");
  revalidatePath("/recibos");
  revalidatePath("/");
  return { ok: true, message: "Cobro actualizado." };
}

export async function getReceiptAction(receiptId: string) {
  await requireAuth();
  if (!isUuid(receiptId)) return { receipt: null, error: "Recibo no encontrado." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receipts")
    .select(
      "id, code, issued_at, client_payments(id, amount, method, paid_at, notes, clients(name, zone, phone))",
    )
    .eq("id", receiptId)
    .maybeSingle();
  return { receipt: data, error: error?.message ?? null };
}
