"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { removeStockForConsignment } from "@/lib/inventory";
import type { ActionResult, Consignment } from "@/lib/data-types";
import type { ConsignmentStatus } from "@/lib/types";

export async function listConsignmentsAction(): Promise<{
  consignments: Consignment[];
  error: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consignments")
    .select("*, clients(name, zone)")
    .order("left_at", { ascending: false });
  if (error) return { consignments: [], error: error.message };
  return { consignments: (data ?? []) as Consignment[], error: null };
}

export async function listOpenConsignmentsAction(): Promise<{
  consignments: Consignment[];
  error: string | null;
}> {
  // Auth any — vendedora needs this for cobros (RLS after migration 002)
  const { requireAuth } = await import("@/lib/auth/guards");
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consignments")
    .select("*, clients(name, zone)")
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
}): Promise<ActionResult> {
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
    return { ok: false, message: error?.message || "No se creó la consignación." };
  }

  const stock = await removeStockForConsignment(row.id, qty, auth.user.id);
  if (!stock.ok) {
    await supabase.from("consignments").delete().eq("id", row.id);
    return { ok: false, message: stock.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/pagos");
  revalidatePath("/inventario");
  revalidatePath("/");
  return { ok: true, message: "Consignación registrada. Stock descontado." };
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
    return { ok: false, message: "Consignación no encontrada." };
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
  revalidatePath("/clientes");
  revalidatePath("/pagos");
  return { ok: true, message: "Precio actualizado." };
}
