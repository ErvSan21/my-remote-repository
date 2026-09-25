"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { missingProfileColumn } from "@/lib/auth/profile-row";
import { isAppRole } from "@/lib/auth/permissions";
import { getAuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
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
  "Para crear, borrar y poner contraseña provisional, pega supabase/migrations/009_admin_users.sql en el SQL Editor de Supabase y ejecútalo.";

const PASSWORD_HASH_HINT =
  "La contraseña no quedó lista para ingresar. Pega supabase/migrations/010_password_hash.sql en el SQL Editor de Supabase, ejecútalo y vuelve a pulsar Generar.";

const PROFILE_SELECTS = [
  "id, username, full_name, email, role, active, enabled_modules, must_change_password",
  "id, username, full_name, email, role, active",
  "id, username, full_name, role, active",
];

type ProfileError = { message: string; code?: string };

function requireSuperadmin() {
  return getAuthContext().then((auth) => {
    if (!auth || auth.profile.role !== "superadmin") return null;
    return auth;
  });
}

function makeProvisionalPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let body = "";
  for (let index = 0; index < 7; index += 1) {
    body += letters[bytes[index] % letters.length];
  }
  body += digits[bytes[7] % digits.length];
  return `Mac-${body}`;
}

function passwordHash(password: string) {
  return bcrypt.hashSync(password, 10);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function missingRpc(error: ProfileError | null) {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    error.code === "PGRST202" ||
    message.includes("could not find the function") ||
    (message.includes("schema cache") && message.includes("function"))
  );
}

function dbMessage(error: ProfileError) {
  const message = error.message.replace(/^.*exception:\s*/i, "");
  if (missingProfileColumn(error)) {
    return "Falta ejecutar supabase/migrations/009_admin_users.sql en el SQL Editor de Supabase.";
  }
  if (missingRpc(error)) return MIGRATION_HINT;
  return message || "No se pudo completar la acción.";
}

function toUser(row: Record<string, unknown>): UserRow | null {
  if (typeof row.id !== "string" || !isAppRole(row.role)) return null;
  const modules = row.enabled_modules;
  return {
    id: row.id,
    email: typeof row.email === "string" ? row.email : null,
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    username: typeof row.username === "string" ? row.username : null,
    role: row.role,
    active: row.active !== false,
    enabled_modules: Array.isArray(modules)
      ? modules.filter((item): item is string => typeof item === "string")
      : null,
    must_change_password: row.must_change_password === true,
  };
}

export async function listUsersAction(): Promise<{
  users: UserRow[];
  error: string | null;
}> {
  const auth = await requireSuperadmin();
  if (!auth) return { users: [], error: "No autorizado." };

  const supabase = await createClient();
  let lastError: ProfileError | null = null;

  for (const columns of PROFILE_SELECTS) {
    const result = await supabase.from("profiles").select(columns);
    if (!result.error) {
      const users = (result.data ?? [])
        .map((row) => toUser(row as unknown as Record<string, unknown>))
        .filter((row): row is UserRow => Boolean(row));
      users.sort((a, b) =>
        (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "", "es"),
      );
      return { users, error: null };
    }
    lastError = result.error;
    if (!missingProfileColumn(result.error)) break;
  }

  return {
    users: [],
    error: lastError ? dbMessage(lastError) : "No se pudieron leer los usuarios.",
  };
}

export async function createUserAction(input: {
  fullName: string;
  email: string;
  role: string;
  modules: string[];
}): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  if (!isAppRole(input.role)) return { ok: false, message: "Elige un rol." };

  const name = boundedText(input.fullName, 120);
  if (!name.ok || !name.value) return { ok: false, message: "Escribe el nombre." };
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, message: "Escribe un correo válido." };

  const modules = sanitizeModules(input.role, input.modules);
  const password = makeProvisionalPassword();
  return createWithSignup(email, password, name.value, input.role, modules);
}

export async function updateUserAccessAction(input: {
  userId: string;
  role: string;
  modules: string[];
}): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  if (!isUuid(input.userId) || !isAppRole(input.role)) {
    return { ok: false, message: "Usuario o rol inválido." };
  }
  if (input.userId === auth.user.id && input.role !== "superadmin") {
    return { ok: false, message: "No puedes quitarte el rol de super admin." };
  }

  const modules = sanitizeModules(input.role, input.modules);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role: input.role,
      enabled_modules: modules,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId)
    .select("id");

  if (error) return { ok: false, message: dbMessage(error) };
  if (!data?.length) return { ok: false, message: "No se pudo guardar el usuario." };

  revalidatePath("/usuarios");
  return { ok: true, message: "Acceso actualizado." };
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  if (!isUuid(userId)) return { ok: false, message: "Usuario inválido." };
  if (userId === auth.user.id) {
    return { ok: false, message: "No puedes bloquear tu propia cuenta." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id");

  if (error) return { ok: false, message: dbMessage(error) };
  if (!data?.length) return { ok: false, message: "No se pudo actualizar el usuario." };

  revalidatePath("/usuarios");
  return {
    ok: true,
    message: active ? "Usuario habilitado." : "Usuario bloqueado.",
  };
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };
  if (!isUuid(userId)) return { ok: false, message: "Usuario inválido." };
  if (userId === auth.user.id) {
    return { ok: false, message: "No puedes eliminar tu propia cuenta." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_user", { target: userId });
  if (error) return { ok: false, message: dbMessage(error) };

  revalidatePath("/usuarios");
  return { ok: true, message: "Usuario eliminado." };
}

export async function resetPasswordAction(
  userId: string,
  newPassword: string,
): Promise<UserActionResult> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, message: "No autorizado." };

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
  if (!isUuid(userId)) return { ok: false, message: "Usuario inválido." };
  return applyProvisionalPassword(userId, makeProvisionalPassword());
}

async function applyProvisionalPassword(
  userId: string,
  password: string,
): Promise<UserActionResult> {
  const supabase = await createClient();
  const profile = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const email = profile.data?.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return { ok: false, message: "Ese usuario no tiene correo para ingresar." };
  }

  const { error } = await supabase.rpc("admin_set_password_hash", {
    target: userId,
    password_hash: passwordHash(password),
  });
  if (error) {
    return {
      ok: false,
      message: missingRpc(error) ? PASSWORD_HASH_HINT : dbMessage(error),
    };
  }

  const login = await passwordLogsIn(email, password);
  if (!login.ok) return { ok: false, message: login.message };

  revalidatePath("/usuarios");
  return {
    ok: true,
    message: "Contraseña provisional lista. El usuario deberá cambiarla al ingresar.",
    password,
  };
}

async function passwordLogsIn(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return { ok: false, message: "Falta la configuración pública de Supabase." };
  }

  const anon = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await anon.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true };
  if (error.message.toLowerCase().includes("email not confirmed")) {
    return {
      ok: false,
      message:
        "El correo todavía no está confirmado. Ejecuta supabase/migrations/010_password_hash.sql y vuelve a generar la contraseña.",
    };
  }
  return { ok: false, message: PASSWORD_HASH_HINT };
}

async function createWithSignup(
  email: string,
  password: string,
  fullName: string,
  role: AppRole,
  modules: string[],
): Promise<UserActionResult> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return { ok: false, message: "Falta la configuración pública de Supabase." };
  }

  const anon = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const signed = await anon.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (signed.error || !signed.data.user) {
    return { ok: false, message: createUserError(signed.error?.message ?? "") };
  }
  const identities = signed.data.user.identities;
  if (!Array.isArray(identities) || identities.length === 0) {
    return { ok: false, message: "Ese correo ya tiene una cuenta." };
  }

  const supabase = await createClient();
  const saved = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      active: true,
      enabled_modules: modules,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", signed.data.user.id)
    .select("id");

  if (saved.error && missingProfileColumn(saved.error)) {
    const basic = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        role,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signed.data.user.id);
    if (basic.error) return { ok: false, message: dbMessage(basic.error) };
  } else if (saved.error) {
    return { ok: false, message: dbMessage(saved.error) };
  }

  if (!signed.data.session) {
    await supabase.rpc("admin_confirm_email", { target: signed.data.user.id });
  }

  const login = await passwordLogsIn(email, password);
  if (!login.ok) return login;

  revalidatePath("/usuarios");
  return {
    ok: true,
    message: "Usuario creado. Comparte la contraseña provisional.",
    password,
  };
}

function createUserError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
    return "Ese correo ya tiene una cuenta.";
  }
  if (lower.includes("signups not allowed") || lower.includes("signup")) {
    return MIGRATION_HINT;
  }
  return message || "No se pudo crear el usuario.";
}
