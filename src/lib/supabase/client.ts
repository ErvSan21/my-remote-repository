import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/env";

/**
 * Cliente Supabase para el browser.
 * Lanza solo al usarse sin keys configuradas (login), no en build estático.
 */
export function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
