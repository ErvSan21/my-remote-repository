import { redirect } from "next/navigation";
import { getAuthContext, type AuthContext } from "@/lib/auth/session";
import type { AppRole } from "@/lib/types";

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return auth;
}

export async function requireAdmin(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (auth.profile.role !== "admin" && auth.profile.role !== "superadmin") {
    redirect("/ventas");
  }
  return auth;
}

export async function requireSuperadmin(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (auth.profile.role !== "superadmin") {
    redirect("/ventas");
  }
  return auth;
}

export function isAdminRole(role: AppRole): boolean {
  return role === "admin" || role === "superadmin";
}

export function isSuperadminRole(role: AppRole): boolean {
  return role === "superadmin";
}
