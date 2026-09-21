"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Supplier } from "@/lib/data-types";

export async function listSuppliersAction(includeInactive = false): Promise<{
  suppliers: Supplier[];
  error: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();
  let query = supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) return { suppliers: [], error: error.message };
  return { suppliers: (data ?? []) as Supplier[], error: null };
}

export async function upsertSupplierAction(input: {
  id?: string;
  name: string;
  location: string;
  phone: string;
  notes: string;
  active?: boolean;
}): Promise<ActionResult> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, message: "El nombre es obligatorio." };

  const supabase = await createClient();
  const payload = {
    name,
    location: input.location.trim() || null,
    phone: input.phone.trim() || null,
    notes: input.notes.trim() || null,
    active: input.active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from("suppliers").insert(payload);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/proveedores");
  revalidatePath("/compras");
  revalidatePath("/pagos-proveedores");
  revalidatePath("/");
  return {
    ok: true,
    message: input.id ? "Proveedor actualizado." : "Proveedor creado.",
  };
}

export async function setSupplierActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/proveedores");
  revalidatePath("/compras");
  revalidatePath("/pagos-proveedores");
  revalidatePath("/");
  return {
    ok: true,
    message: active ? "Proveedor reactivado." : "Proveedor desactivado.",
  };
}
