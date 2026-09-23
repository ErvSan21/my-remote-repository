"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/session";
import { hasSupabaseServiceEnv } from "@/lib/env";
import { isUuid } from "@/lib/validation";
import type { AppRole } from "@/lib/types";

export type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  role: AppRole;
  active: boolean;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

export async function listUsersAction(): Promise<{
  users: UserRow[];
  error: string | null;
}> {
  const auth = await getAuthContext();
  if (!auth || auth.profile.role !== "superadmin") {
    return { users: [], error: "No autorizado." };
  }

  if (!hasSupabaseServiceEnv()) {
    return {
      users: [],
      error:
        "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para listar usuarios.",
    };
  }

  try {
    const admin = createServiceClient();
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      perPage: 200,
    });

    if (listError) {
      return { users: [], error: listError.message };
    }

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, username, full_name, role, active");

    if (profilesError) {
      return { users: [], error: profilesError.message };
    }

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users: UserRow[] = (listData.users ?? []).map((u) => {
      const profile = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: profile?.full_name ?? null,
        username: profile?.username ?? null,
        role: (profile?.role as AppRole) ?? "vendedora",
        active: profile?.active ?? true,
      };
    });

    users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return { users, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar usuarios.";
    return { users: [], error: message };
  }
}

export async function resetPasswordAction(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  const auth = await getAuthContext();
  if (!auth || auth.profile.role !== "superadmin") {
    return { ok: false, message: "No autorizado." };
  }

  const password = newPassword.trim();
  if (!isUuid(userId) || password.length < 8 || password.length > 72) {
    return {
      ok: false,
      message: "Usuario inválido o contraseña fuera de 8 a 72 caracteres.",
    };
  }

  if (!hasSupabaseServiceEnv()) {
    return {
      ok: false,
      message: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.",
    };
  }

  try {
    const admin = createServiceClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/usuarios");
    return { ok: true, message: "Contraseña actualizada." };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "No se pudo resetear la contraseña.";
    return { ok: false, message };
  }
}
