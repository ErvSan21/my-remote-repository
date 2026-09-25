import { isAppRole } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  role: AppRole;
  active: boolean;
  enabled_modules: string[] | null;
  must_change_password: boolean;
};

type ProfileError = { message: string; code?: string } | null;

type ProfileQuery = {
  data: Record<string, unknown> | null;
  error: ProfileError;
};

const FULL_COLUMNS =
  "id, username, full_name, role, active, enabled_modules, must_change_password";
const BASE_COLUMNS = "id, username, full_name, role, active";

export function missingProfileColumn(error: ProfileError): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("enabled_modules") ||
    message.includes("must_change_password") ||
    message.includes("schema cache")
  );
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asModules(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

function toProfile(row: Record<string, unknown>, extras: boolean): Profile | null {
  if (!isAppRole(row.role) || typeof row.id !== "string") return null;
  return {
    id: row.id,
    username: asText(row.username),
    full_name: asText(row.full_name),
    role: row.role,
    active: row.active !== false,
    enabled_modules: extras ? asModules(row.enabled_modules) : null,
    must_change_password: extras ? row.must_change_password === true : false,
  };
}

export async function fetchProfileRow(
  load: (columns: string) => PromiseLike<ProfileQuery>,
): Promise<{ profile: Profile | null; error: ProfileError }> {
  const full = await load(FULL_COLUMNS);

  if (!full.error) {
    return { profile: full.data ? toProfile(full.data, true) : null, error: null };
  }

  if (!missingProfileColumn(full.error)) {
    return { profile: null, error: full.error };
  }

  const basic = await load(BASE_COLUMNS);

  if (basic.error || !basic.data) {
    return { profile: null, error: basic.error };
  }

  return { profile: toProfile(basic.data, false), error: null };
}
