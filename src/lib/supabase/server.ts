import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicEnv } from "@/lib/env";

/**
 * Cliente Supabase para Server Components / Route Handlers / Server Actions.
 */
export async function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // set desde Server Component puede fallar; middleware refresca la sesión.
        }
      },
    },
  });
}
