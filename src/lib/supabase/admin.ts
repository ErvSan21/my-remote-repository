import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";

/**
 * Cliente con service_role — SOLO en servidor (reset password, jobs admin).
 * Nunca importar desde componentes client.
 */
export function createServiceClient() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para operaciones admin.",
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
