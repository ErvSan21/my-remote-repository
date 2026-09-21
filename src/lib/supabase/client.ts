import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/env";

/**
 * Browser client (official @supabase/ssr pattern).
 * Uses PUBLISHABLE_KEY (preferred) or ANON_KEY fallback.
 */
export function createClient() {
  const { url, key } = requireSupabasePublicEnv();
  return createBrowserClient(url, key);
}
