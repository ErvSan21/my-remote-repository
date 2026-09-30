"use server";

import { revalidatePath } from "next/cache";
import { isAdminRole, requireAdmin, requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { boundedText, isUuid, parsePhone } from "@/lib/validation";
import { isDepartamento } from "@/lib/bolivia";
import { missingColumnError } from "@/lib/db-errors";
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

/** Alta de cliente desde "Registrar": persona, empresa opcional, departamento y celular obligatorio. */
export async function createClientDetailedAction(input: {
  firstName: string;
  lastName: string;
  companyName: string;
  showCompany: boolean;
  city: string;
  phone: string;
  notes: string;
}): Promise<ActionResult> {
  await requireAdmin();
  const first = boundedText(input.firstName, 80);
  const last = boundedText(input.lastName, 80);
  const company = boundedText(input.companyName, 160);
  const notes = boundedText(input.notes);
  const phone = parsePhone(input.phone);
  if (!first.ok || !last.ok || !company.ok || !notes.ok) {
    return { ok: false, message: "Texto demasiado largo." };
  }
  if (!first.value) return { ok: false, message: "Escribe el nombre." };
  if (input.showCompany && !company.value) {
    return { ok: false, message: "Escribe el nombre de la empresa para mostrarlo." };
  }
  if (!isDepartamento(input.city)) {
    return { ok: false, message: "Elige la ciudad." };
  }
  if (!phone.ok) return { ok: false, message: phone.message };
  if (phone.value.length !== 8) return { ok: false, message: "El celular debe tener 8 números." };

  const person = [first.value, last.value].filter(Boolean).join(" ");
  const displayName = input.showCompany ? company.value : person;
  const base = {
    name: displayName,
    zone: input.city,
    phone: phone.value,
    notes: notes.value || null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    ...base,
    first_name: first.value,
    last_name: last.value || null,
    company_name: company.value || null,
    show_company: input.showCompany,
  });

  if (error) {
    // Sin la migración 012 las columnas nuevas no existen: guarda lo básico y deja
    // persona/empresa en las notas para no perder el dato.
    if (!missingColumnError(error)) return { ok: false, message: error.message };
    const extra = input.showCompany ? `Contacto: ${person}` : company.value ? `Empresa: ${company.value}` : "";
    const fallback = await supabase.from("clients").insert({
      ...base,
      notes: [extra, notes.value].filter(Boolean).join(" · ") || null,
    });
    if (fallback.error) return { ok: false, message: fallback.error.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/ventas");
  return { ok: true, message: `Cliente ${displayName} registrado.` };
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
  const phone = parsePhone(input.phone);
  const notes = boundedText(input.notes);
  if (!name.ok || !name.value) return { ok: false, message: "El nombre es obligatorio." };
  if (!phone.ok) return { ok: false, message: phone.message };
  if (!zone.ok || !notes.ok) {
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
