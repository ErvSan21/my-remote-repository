"use server";

import { createClient } from "@/lib/supabase/server";

/** Entrada de stock al registrar una compra. */
export async function addStockFromPurchase(
  purchaseId: string,
  quantityBirds: number,
  userId: string,
  label?: string,
) {
  const supabase = await createClient();
  const { data: lot, error: lotError } = await supabase
    .from("inventory_lots")
    .insert({
      label: label || `Compra ${purchaseId.slice(0, 8)}`,
      quantity_birds: quantityBirds,
      source_purchase_id: purchaseId,
    })
    .select("id")
    .single();

  if (lotError || !lot) {
    return { ok: false as const, message: lotError?.message || "No se creó el lote." };
  }

  const { error: movError } = await supabase.from("inventory_movements").insert({
    lot_id: lot.id,
    delta_birds: quantityBirds,
    reason: "purchase_in",
    ref_purchase_id: purchaseId,
    recorded_by: userId,
    notes: "Entrada por compra",
  });

  if (movError) {
    await supabase.from("inventory_lots").delete().eq("id", lot.id);
    return { ok: false as const, message: movError.message };
  }
  return { ok: true as const };
}

/** Ajusta el lote de una compra cuando el superadmin cambia la cantidad. */
export async function adjustStockForPurchaseQtyChange(
  purchaseId: string,
  previousQty: number,
  nextQty: number,
  userId: string,
) {
  const delta = nextQty - previousQty;
  if (delta === 0) return { ok: true as const };

  const supabase = await createClient();
  const { data: lots, error } = await supabase
    .from("inventory_lots")
    .select("id, quantity_birds, closed_at")
    .eq("source_purchase_id", purchaseId)
    .order("opened_at", { ascending: false });

  if (error) return { ok: false as const, message: error.message };
  const lot = lots?.[0];
  if (!lot) {
    return {
      ok: false as const,
      message:
        "No hay lote de inventario ligado a esta compra. No se cambió la cantidad.",
    };
  }

  const have = Number(lot.quantity_birds);
  const nextLotQty = have + delta;
  if (nextLotQty < 0) {
    return {
      ok: false as const,
      message: `No se puede bajar la cantidad: el lote solo tiene ${have} aves disponibles.`,
    };
  }

  const { error: updError } = await supabase
    .from("inventory_lots")
    .update({
      quantity_birds: nextLotQty,
      closed_at: nextLotQty === 0 ? new Date().toISOString() : null,
    })
    .eq("id", lot.id);
  if (updError) return { ok: false as const, message: updError.message };

  const { error: movError } = await supabase.from("inventory_movements").insert({
    lot_id: lot.id,
    delta_birds: delta,
    reason: "adjustment",
    ref_purchase_id: purchaseId,
    recorded_by: userId,
    notes: "Ajuste por edición de compra",
  });
  if (movError) {
    await supabase
      .from("inventory_lots")
      .update({
        quantity_birds: have,
        closed_at: lot.closed_at,
      })
      .eq("id", lot.id);
    return { ok: false as const, message: movError.message };
  }

  return { ok: true as const };
}

/** Sale stock por consignación (FIFO sobre lotes abiertos). */
export async function removeStockForConsignment(
  consignmentId: string,
  quantityBirds: number,
  userId: string,
) {
  const supabase = await createClient();
  const { data: lots, error } = await supabase
    .from("inventory_lots")
    .select("id, quantity_birds")
    .is("closed_at", null)
    .gt("quantity_birds", 0)
    .order("opened_at", { ascending: true });

  if (error) return { ok: false as const, message: error.message };

  const available = (lots ?? []).reduce(
    (s, l) => s + Number(l.quantity_birds),
    0,
  );
  if (available < quantityBirds) {
    return {
      ok: false as const,
      message: `Stock insuficiente. Disponible: ${available} aves.`,
    };
  }

  const applied: { id: string; previousQty: number }[] = [];
  let remaining = quantityBirds;
  for (const lot of lots ?? []) {
    if (remaining <= 0) break;
    const have = Number(lot.quantity_birds);
    const take = Math.min(have, remaining);
    const nextQty = have - take;
    const { error: updError } = await supabase
      .from("inventory_lots")
      .update({
        quantity_birds: nextQty,
        closed_at: nextQty === 0 ? new Date().toISOString() : null,
      })
      .eq("id", lot.id);
    if (updError) {
      await revertConsignmentStock(supabase, consignmentId, applied);
      return { ok: false as const, message: updError.message };
    }
    applied.push({ id: lot.id, previousQty: have });

    const { error: movError } = await supabase.from("inventory_movements").insert({
      lot_id: lot.id,
      delta_birds: -take,
      reason: "consignment_out",
      ref_consignment_id: consignmentId,
      recorded_by: userId,
      notes: "Salida por consignación",
    });
    if (movError) {
      await revertConsignmentStock(supabase, consignmentId, applied);
      return { ok: false as const, message: movError.message };
    }
    remaining -= take;
  }

  return { ok: true as const };
}

async function revertConsignmentStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  consignmentId: string,
  applied: { id: string; previousQty: number }[],
) {
  for (const step of [...applied].reverse()) {
    await supabase
      .from("inventory_movements")
      .delete()
      .eq("lot_id", step.id)
      .eq("ref_consignment_id", consignmentId);
    await supabase
      .from("inventory_lots")
      .update({
        quantity_birds: step.previousQty,
        closed_at: null,
      })
      .eq("id", step.id);
  }
}

export async function getPolloDisponible(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_lots")
    .select("quantity_birds")
    .is("closed_at", null);

  if (error || !data) {
    // fallback vista
    const view = await supabase.from("v_pollo_disponible").select("quantity_birds").maybeSingle();
    return Number(view.data?.quantity_birds ?? 0);
  }
  return data.reduce((s, r) => s + Number(r.quantity_birds), 0);
}
