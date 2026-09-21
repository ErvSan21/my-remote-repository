"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Client } from "@/lib/data-types";

export async function listClientsAction(includeInactive = false): Promise<{
  clients: Client[];
  error: string | null;
}> {
  await requireAuth();
  const supabase = await createClient();
  let query = supabase.from("clients").select("*").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return { clients: [], error: error.message };
  return { clients: (data ?? []) as Client[], error: null };
}

export async function upsertClientAction(input: {
  id?: string;
  name: string;
  zone: string;
  phone: string;
  notes: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, message: "El nombre es obligatorio." };

  const supabase = await createClient();
  const payload = {
    name,
    zone: input.zone.trim() || null,
    phone: input.phone.trim() || null,
    notes: input.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("clients").update(payload).eq("id", input.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from("clients").insert(payload);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/pagos");
  return {
    ok: true,
    message: input.id ? "Cliente actualizado." : "Cliente creado.",
  };
}

export async function setClientActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/clientes");
  revalidatePath("/pagos");
  return {
    ok: true,
    message: active ? "Cliente reactivado." : "Cliente desactivado.",
  };
}
