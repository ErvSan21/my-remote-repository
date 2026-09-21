/** Helpers de entorno — no lanzan en build; las keys reales las pone Ervin en .env.local / Vercel. */

const PLACEHOLDER_HINTS = [
  "YOUR_PROJECT_REF",
  "your_supabase_anon_key_here",
  "your_supabase_service_role_key_here",
];

function looksConfigured(value: string | undefined): value is string {
  if (!value || !value.trim()) return false;
  return !PLACEHOLDER_HINTS.some((hint) => value.includes(hint));
}

export function getSupabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return looksConfigured(url) ? url : undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return looksConfigured(key) ? key : undefined;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return looksConfigured(key) ? key : undefined;
}

export function hasSupabasePublicEnv(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasSupabaseServiceEnv(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function requireSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.local.example a .env.local y pega las keys de tu proyecto Supabase.",
    );
  }
  return { url, anonKey };
}
