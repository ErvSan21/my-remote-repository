import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/env";

/**
 * Browser client (official @supabase/ssr pattern).
 * Prefer passing url/key from the server (runtime .env) so `next start`
 * works even if the client bundle was built before keys existed.
 */
export function createClient(url?: string, key?: string) {
  if (url && key) {
    return createBrowserClient(url, key);
  }
  const env = requireSupabasePublicEnv();
  return createBrowserClient(env.url, env.key);
}
