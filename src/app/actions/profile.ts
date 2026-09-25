"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { missingProfileColumn } from "@/lib/auth/profile-row";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseServiceEnv } from "@/lib/env";
import type { ActionResult } from "@/lib/data-types";
import { boundedText, parsePhone } from "@/lib/validation";

const NAME_MAX = 60;

export async function updateOwnProfileAction(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  const first = boundedText(input.firstName, NAME_MAX);
  const last = boundedText(input.lastName, NAME_MAX);
  if (!first.ok || !last.ok) {
    return { ok: false, message: "El nombre es demasiado largo." };
  }
  if (!first.value) return { ok: false, message: "Escribe el nombre." };

  const parsed = parsePhone(input.phone);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  if (parsed.value && parsed.value.length !== 8) {
    return { ok: false, message: "El celular debe tener 8 números." };
  }

  const fullName = [first.value, last.value].filter(Boolean).join(" ");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName, phone: parsed.value },
  });
  if (error) return { ok: false, message: error.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", auth.user.id);
  if (profileError) {
    await supabase.rpc("update_own_profile", { p_full_name: fullName });
  }

  revalidatePath("/perfil");
  return { ok: true, message: "Datos actualizados." };
}

export async function changePasswordAction(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  const email = auth.user.email;
  if (!email) return { ok: false, message: "Esta cuenta no tiene correo." };

  const current = input.current;
  const next = input.next;
  if (!current) return { ok: false, message: "Escribe la contraseña actual." };
  if (next.length < 8) {
    return {
      ok: false,
      message: "La nueva contraseña debe tener al menos 8 caracteres.",
    };
  }
  if (next !== input.confirm) {
    return { ok: false, message: "La confirmación no coincide." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: current,
  });
  if (signInError) {
    return { ok: false, message: "La contraseña actual no es correcta." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, message: passwordError(error.message) };

  const cleared = await clearMustChangePassword(auth.user.id);
  if (!cleared.ok) return cleared;

  revalidatePath("/perfil");
  return { ok: true, message: "Contraseña actualizada." };
}

export async function replaceProvisionalPasswordAction(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth.profile.must_change_password) {
    return { ok: false, message: "Tu contraseña ya está actualizada." };
  }

  const email = auth.user.email;
  if (!email) return { ok: false, message: "Esta cuenta no tiene correo." };
  if (!input.current) return { ok: false, message: "Escribe la contraseña provisional." };
  if (input.next.length < 8) {
    return { ok: false, message: "La nueva contraseña debe tener al menos 8 caracteres." };
  }
  if (input.next !== input.confirm) {
    return { ok: false, message: "La confirmación no coincide." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: input.current,
  });
  if (signInError) {
    return { ok: false, message: "La contraseña provisional no es correcta." };
  }

  const { error } = await supabase.auth.updateUser({ password: input.next });
  if (error) return { ok: false, message: passwordError(error.message) };

  const cleared = await clearMustChangePassword(auth.user.id);
  if (!cleared.ok) return cleared;

  revalidatePath("/");
  return { ok: true, message: "Contraseña actualizada." };
}

async function clearMustChangePassword(userId: string): Promise<ActionResult> {
  if (hasSupabaseServiceEnv()) {
    const admin = createServiceClient();
    const { error } = await admin
      .from("profiles")
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error && !missingProfileColumn(error)) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_password_change");
  if (error && !missingProfileColumn(error)) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "" };
}

function passwordError(message: string) {
  if (/different from the old/i.test(message)) {
    return "La nueva contraseña debe ser distinta a la actual.";
  }
  if (/at least/i.test(message)) {
    return "La contraseña no cumple el mínimo de caracteres.";
  }
  return message;
}
