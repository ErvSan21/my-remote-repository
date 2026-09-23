"use server";

import { revalidatePath } from "next/cache";
import { isAdminRole, requireAdmin, requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { boundedText, isUuid } from "@/lib/validation";
import type { ActionResult, Client } from "@/lib/data-types";

export async function listClientsAction(includeInactive = false): Promise<{
  clients: Client[];
  error: string | null;
}> {
  const auth = await requireAuth();
  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, zone, phone, notes, active, created_at, updated_at")
    .order("name");
  if (!includeInactive || !isAdminRole(auth.profile.role)) {
    query = query.eq("active", true);
  }
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
  const name = boundedText(input.name, 200);
  const zone = boundedText(input.zone, 120);
  const phone = boundedText(input.phone, 40);
  const notes = boundedText(input.notes);
  if (!name.ok || !name.value) return { ok: false, message: "El nombre es obligatorio." };
  if (!zone.ok || !phone.ok || !notes.ok) {
    return { ok: false, message: "Texto demasiado largo." };
  }
  if (input.id && !isUuid(input.id)) return { ok: false, message: "Cliente inválido." };

  const supabase = await createClient();
  const payload = {
    name: name.value,
    zone: zone.value || null,
    phone: phone.value || null,
    notes: notes.value || null,
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
  revalidatePath("/ventas");
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
  if (!isUuid(id)) return { ok: false, message: "Cliente inválido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/clientes");
  revalidatePath("/ventas");
  return {
    ok: true,
    message: active ? "Cliente reactivado." : "Cliente desactivado.",
  };
}
