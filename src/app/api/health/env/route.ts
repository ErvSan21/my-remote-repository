import { NextResponse } from "next/server";
import { getPublicEnvStatus } from "@/lib/env";

/** Diagnóstico de la config pública. No indica si existe la service role. */
export async function GET() {
  const status = getPublicEnvStatus();
  return NextResponse.json({
    ok: status.hasUrl && status.hasAnyPublicKey,
    hasUrl: status.hasUrl,
    hasPublishableKey: status.hasPublishableKey,
    hasAnonKey: status.hasAnonKey,
    hasAnyPublicKey: status.hasAnyPublicKey,
    hint:
      !status.hasUrl || !status.hasAnyPublicKey
        ? "Copia .env.local.example → .env.local, pega URL + PUBLISHABLE_KEY (o ANON_KEY), reinicia npm run dev."
        : "Env pública OK.",
  });
}
