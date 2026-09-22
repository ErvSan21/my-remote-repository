"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperadmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Supplier } from "@/lib/data-types";

function revalidateSuppliers(id?: string) {
  revalidatePath("/proveedores");
  revalidatePath("/proveedores/compras");
  revalidatePath("/pagos-proveedores");
  revalidatePath("/");
  if (id) {
    revalidatePath(`/proveedores/${id}`);
    revalidatePath(`/proveedores/${id}/editar`);
  }
}

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

export async function getSupplierAction(id: string): Promise<{
  supplier: Supplier | null;
  error: string | null;
}> {
  await requireAdmin();
  if (!id) return { supplier: null, error: "Proveedor inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { supplier: null, error: error.message };
  if (!data) return { supplier: null, error: "Proveedor no encontrado." };
  return { supplier: data as Supplier, error: null };
}

export async function createSupplierAction(input: {
  name: string;
  location: string;
  phone: string;
  notes: string;
}): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, message: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      location: input.location.trim() || null,
      phone: input.phone.trim() || null,
      notes: input.notes.trim() || null,
      active: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message || "No se creó el proveedor." };
  }
  revalidateSuppliers(data.id);
  return { ok: true, message: "Proveedor creado.", id: data.id };
}

export async function updateSupplierAction(input: {
  id: string;
  name: string;
  location: string;
  phone: string;
  notes: string;
  active?: boolean;
}): Promise<ActionResult> {
  await requireSuperadmin();
  if (!input.id) return { ok: false, message: "Proveedor inválido." };
  const name = input.name.trim();
  if (!name) return { ok: false, message: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      name,
      location: input.location.trim() || null,
      phone: input.phone.trim() || null,
      notes: input.notes.trim() || null,
      active: input.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { ok: false, message: error.message };
  revalidateSuppliers(input.id);
  return { ok: true, message: "Proveedor actualizado." };
}

/** @deprecated Prefer createSupplierAction / updateSupplierAction */
export async function upsertSupplierAction(input: {
  id?: string;
  name: string;
  location: string;
  phone: string;
  notes: string;
  active?: boolean;
}): Promise<ActionResult> {
  if (input.id) {
    return updateSupplierAction({
      id: input.id,
      name: input.name,
      location: input.location,
      phone: input.phone,
      notes: input.notes,
      active: input.active,
    });
  }
  return createSupplierAction(input);
}

export async function setSupplierActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireSuperadmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidateSuppliers(id);
  return {
    ok: true,
    message: active ? "Proveedor reactivado." : "Proveedor desactivado.",
  };
}
