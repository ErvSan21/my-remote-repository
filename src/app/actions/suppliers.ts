"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperadmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { readSuppliers } from "@/lib/reads";
import { boundedText, isUuid, parsePhone } from "@/lib/validation";
import type { ActionResult, Supplier } from "@/lib/data-types";

function revalidateSuppliers(id?: string) {
  revalidatePath("/proveedores");
  revalidatePath("/compras");
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
  const { data, error } = await readSuppliers(includeInactive);
  if (error) return { suppliers: [], error: error.message };
  return { suppliers: (data ?? []) as Supplier[], error: null };
}

export async function getSupplierAction(id: string): Promise<{
  supplier: Supplier | null;
  error: string | null;
}> {
  await requireAdmin();
  if (!isUuid(id)) return { supplier: null, error: "Proveedor no encontrado." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, location, phone, notes, active, created_at, updated_at")
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
  const name = boundedText(input.name, 200);
  const location = boundedText(input.location, 120);
  const phone = parsePhone(input.phone);
  const notes = boundedText(input.notes);
  if (!name.ok || !name.value) return { ok: false, message: "El nombre es obligatorio." };
  if (!phone.ok) return { ok: false, message: phone.message };
  if (!location.ok || !notes.ok) {
    return { ok: false, message: "Texto demasiado largo." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: name.value,
      location: location.value || null,
      phone: phone.value || null,
      notes: notes.value || null,
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
  const name = boundedText(input.name, 200);
  const location = boundedText(input.location, 120);
  const phone = parsePhone(input.phone);
  const notes = boundedText(input.notes);
  if (!isUuid(input.id)) return { ok: false, message: "Proveedor inválido." };
  if (!name.ok || !name.value) return { ok: false, message: "El nombre es obligatorio." };
  if (!phone.ok) return { ok: false, message: phone.message };
  if (!location.ok || !notes.ok) {
    return { ok: false, message: "Texto demasiado largo." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: name.value,
      location: location.value || null,
      phone: phone.value || null,
      notes: notes.value || null,
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

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  await requireSuperadmin();
  if (!isUuid(id)) return { ok: false, message: "Proveedor inválido." };

  const supabase = await createClient();
  const [purchasesRes, paymentsRes] = await Promise.all([
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", id),
    supabase
      .from("supplier_payments")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", id),
  ]);
  if (purchasesRes.error) return { ok: false, message: purchasesRes.error.message };
  if (paymentsRes.error) return { ok: false, message: paymentsRes.error.message };
  if ((purchasesRes.count ?? 0) > 0 || (paymentsRes.count ?? 0) > 0) {
    return {
      ok: false,
      message: "Este proveedor tiene compras o pagos. No se puede eliminar.",
    };
  }

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateSuppliers();
  return { ok: true, message: "Proveedor eliminado." };
}

export async function setSupplierActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireSuperadmin();
  if (!isUuid(id)) return { ok: false, message: "Proveedor inválido." };
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
