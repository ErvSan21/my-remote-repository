"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/data-types";
import { parsePhone } from "@/lib/validation";

export async function updateOwnPhoneAction(phone: string): Promise<ActionResult> {
  await requireAuth();
  const parsed = parsePhone(phone);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  if (parsed.value && parsed.value.length !== 8) {
    return { ok: false, message: "El celular debe tener 8 números." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { phone: parsed.value },
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/perfil");
  return { ok: true, message: "Celular actualizado." };
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

  revalidatePath("/perfil");
  return { ok: true, message: "Contraseña actualizada." };
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
