"use server";

import { revalidatePath } from "next/cache";
import { missingProfileColumn } from "@/lib/auth/profile-row";
import { isAppRole } from "@/lib/auth/permissions";
import { getAuthContext } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceEnv } from "@/lib/env";
import { sanitizeModules } from "@/lib/modules";
import type { AppRole } from "@/lib/types";
import { boundedText, isUuid } from "@/lib/validation";

export type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  role: AppRole;
  active: boolean;
  enabled_modules: string[] | null;
  must_change_password: boolean;
};

export type UserActionResult = {
  ok: boolean;
  message: string;
  password?: string;
};

const MIGRATION_HINT =
  "Falta ejecutar supabase/migrations/008_user_modules.sql en el SQL Editor de Supabase.";

function requireSuperadmin() {
  return getAuthContext().then((auth) => {
    if (!auth || auth.profile.role !== "superadmin") return null;
    return auth;
  });
}

function serviceReady(): UserActionResult | null {
  if (hasSupabaseServiceEnv()) return null;
  return {
    ok: false,
    message: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.",
  };
}

function migrationMessage(error: { message: string; code?: string }): string {
  return missingProfileColumn(error) ? MIGRATION_HINT : error.message;
}

function makeProvisionalPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `Mac-${body}`;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function listUsersAction(): Promise<{
  users: UserRow[];
  error: string | null;
}> {
  const auth = await requireSuperadmin();
  if (!auth) return { users: [], error: "No autorizado." };

  const missing = serviceReady();
  if (missing) return { users: [], error: missing.message };

  try {
    const admin = createServiceClient();
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      perPage: 200,
    });
    if (listError) return { users: [], error: listError.message };

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select(
        "id, username, full_name, role, active, enabled_modules, must_change_password",
      );

    if (profilesError) {
      return { users: [], error: migrationMessage(profilesError) };
    }

    const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const users: UserRow[] = (listData.users ?? []).map((user) => {
      const profile = byId.get(user.id);
      const role = isAppRole(profile?.role) ? profile.role : "vendedora";
      const stored = profile?.enabled_modules;
      return {
        id: user.id,
        email: user.email ?? null,
        full_name: profile?.full_name ?? null,
        username: profile?.username ?? null,
        role,
        active: profile?.active ?? true,
        enabled_modules: Array.isArray(stored) ? stored : null,
        must_change_password: profile?.must_change_password === true,
      };
    });

    users.sort((a, b) =>
      (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "", "es"),
    );
    return { users, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al listar usuarios.";
    return { users: [], error: message };
  }
}

export async function createUserAction(input: {
  fullName: string;
  email: string;
  role: string;
  modules: string[];
}): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  const missing = serviceReady();
  if (missing) return missing;
  if (!isAppRole(input.role)) return { ok: false, message: "Elige un rol." };

  const name = boundedText(input.fullName, 120);
  if (!name.ok || !name.value) return { ok: false, message: "Escribe el nombre." };
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, message: "Escribe un correo válido." };

  const modules = sanitizeModules(input.role, input.modules);
  const password = makeProvisionalPassword();

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name.value, role: input.role },
    });
    if (error || !data.user) {
      return { ok: false, message: createUserError(error?.message ?? "") };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: name.value,
        role: input.role,
        active: true,
        enabled_modules: modules,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);

    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return { ok: false, message: migrationMessage(profileError) };
    }

    revalidatePath("/usuarios");
    return {
      ok: true,
      message: "Usuario creado. Comparte la contraseña provisional.",
      password,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    return { ok: false, message };
  }
}

export async function updateUserAccessAction(input: {
  userId: string;
  role: string;
  modules: string[];
}): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  const missing = serviceReady();
  if (missing) return missing;
  if (!isUuid(input.userId) || !isAppRole(input.role)) {
    return { ok: false, message: "Usuario o rol inválido." };
  }
  if (input.userId === auth.user.id && input.role !== "superadmin") {
    return { ok: false, message: "No puedes quitarte el rol de super admin." };
  }

  const modules = sanitizeModules(input.role, input.modules);
  try {
    const admin = createServiceClient();
    const { error } = await admin
      .from("profiles")
      .update({
        role: input.role,
        enabled_modules: modules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.userId);
    if (error) return { ok: false, message: migrationMessage(error) };

    await admin.auth.admin.updateUserById(input.userId, {
      user_metadata: { role: input.role },
    });

    revalidatePath("/usuarios");
    return { ok: true, message: "Acceso actualizado." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar.";
    return { ok: false, message };
  }
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  const missing = serviceReady();
  if (missing) return missing;
  if (!isUuid(userId)) return { ok: false, message: "Usuario inválido." };
  if (userId === auth.user.id) {
    return { ok: false, message: "No puedes bloquear tu propia cuenta." };
  }

  try {
    const admin = createServiceClient();
    const { error } = await admin
      .from("profiles")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return { ok: false, message: error.message };

    const banned = await admin.auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : "876000h",
    });
    if (banned.error) return { ok: false, message: banned.error.message };

    revalidatePath("/usuarios");
    return {
      ok: true,
      message: active ? "Usuario habilitado." : "Usuario bloqueado.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar.";
    return { ok: false, message };
  }
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  const missing = serviceReady();
  if (missing) return missing;
  if (!isUuid(userId)) return { ok: false, message: "Usuario inválido." };
  if (userId === auth.user.id) {
    return { ok: false, message: "No puedes eliminar tu propia cuenta." };
  }

  try {
    const admin = createServiceClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/usuarios");
    return { ok: true, message: "Usuario eliminado." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar.";
    return { ok: false, message };
  }
}

export async function resetPasswordAction(
  userId: string,
  newPassword: string,
): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  const missing = serviceReady();
  if (missing) return missing;

  const password = newPassword.trim();
  if (!isUuid(userId) || password.length < 8 || password.length > 72) {
    return {
      ok: false,
      message: "Usuario inválido o contraseña fuera de 8 a 72 caracteres.",
    };
  }

  return applyProvisionalPassword(userId, password);
}

export async function setProvisionalPasswordAction(
  userId: string,
): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  const missing = serviceReady();
  if (missing) return missing;
  if (!isUuid(userId)) return { ok: false, message: "Usuario inválido." };

  return applyProvisionalPassword(userId, makeProvisionalPassword());
}

async function applyProvisionalPassword(
  userId: string,
  password: string,
): Promise<UserActionResult> {
  try {
    const admin = createServiceClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return { ok: false, message: error.message };

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profileError) return { ok: false, message: migrationMessage(profileError) };

    revalidatePath("/usuarios");
    return {
      ok: true,
      message: "Contraseña provisional lista. El usuario deberá cambiarla al ingresar.",
      password,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo restablecer la contraseña.";
    return { ok: false, message };
  }
}

function createUserError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
    return "Ese correo ya tiene una cuenta.";
  }
  return message || "No se pudo crear el usuario.";
}
