/** Helpers de entorno — no lanzan en build; las keys reales las pone Ervin en .env.local / Vercel. */

const PLACEHOLDER_HINTS = [
  "YOUR_PROJECT_REF",
  "your_supabase_publishable_key_here",
  "your_supabase_anon_key_here",
  "your_supabase_service_role_key_here",
];

/** Trim + quitar comillas accidentales del .env */
function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

function looksConfigured(value: string | undefined): value is string {
  const v = cleanEnv(value);
  if (!v) return false;
  return !PLACEHOLDER_HINTS.some((hint) => v.includes(hint));
}

export function getSupabaseUrl(): string | undefined {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return looksConfigured(url) ? url : undefined;
}

/**
 * Prefer the new dashboard name `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 * Fall back to legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` for older projects.
 */
export function getSupabasePublishableKey(): string | undefined {
  const publishable = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (looksConfigured(publishable)) return publishable;

  const anon = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (looksConfigured(anon)) return anon;

  return undefined;
}

/** @deprecated Prefer getSupabasePublishableKey — kept as alias for call sites. */
export function getSupabaseAnonKey(): string | undefined {
  return getSupabasePublishableKey();
}

export function getSupabaseServiceRoleKey(): string | undefined {
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return looksConfigured(key) ? key : undefined;
}

export function hasSupabasePublicEnv(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function hasSupabaseServiceEnv(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

/** Estado booleano sin filtrar secretos — útil para diagnóstico en /login. */
export function getPublicEnvStatus() {
  return {
    hasUrl: Boolean(getSupabaseUrl()),
    hasPublishableKey: looksConfigured(
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    ),
    hasAnonKey: looksConfigured(
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ),
    hasAnyPublicKey: Boolean(getSupabasePublishableKey()),
    hasServiceRole: Boolean(getSupabaseServiceRoleKey()),
  };
}

export function requireSupabasePublicEnv(): { url: string; key: string } {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o ANON_KEY). Copia .env.local.example a .env.local y reinicia `npm run dev`.",
    );
  }
  return { url, key };
}
