"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import type { ActionState } from "@/lib/action-state";

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin/agenda",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos, o la cuenta no tiene acceso." };
    }
    throw error;
  }
  return null;
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}
