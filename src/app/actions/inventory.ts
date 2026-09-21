"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getPolloDisponible } from "@/lib/inventory";
import type { InventoryMovement } from "@/lib/data-types";

export async function getInventoryAction(): Promise<{
  available: number;
  lots: { id: string; label: string | null; quantity_birds: number; opened_at: string }[];
  movements: InventoryMovement[];
  error: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();
  const available = await getPolloDisponible();

  const [lotsRes, movRes] = await Promise.all([
    supabase
      .from("inventory_lots")
      .select("id, label, quantity_birds, opened_at")
      .is("closed_at", null)
      .order("opened_at", { ascending: false }),
    supabase
      .from("inventory_movements")
      .select("id, lot_id, delta_birds, reason, notes, moved_at")
      .order("moved_at", { ascending: false })
      .limit(40),
  ]);

  return {
    available,
    lots: (lotsRes.data ?? []) as {
      id: string;
      label: string | null;
      quantity_birds: number;
      opened_at: string;
    }[],
    movements: (movRes.data ?? []) as InventoryMovement[],
    error: lotsRes.error?.message || movRes.error?.message || null,
  };
}
