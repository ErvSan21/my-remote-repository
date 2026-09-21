import { NextResponse } from "next/server";
import { getPublicEnvStatus } from "@/lib/env";

/** Diagnóstico sin secretos: qué env vars ve el servidor. */
export async function GET() {
  const status = getPublicEnvStatus();
  return NextResponse.json({
    ok: status.hasUrl && status.hasAnyPublicKey,
    ...status,
    hint: !status.hasUrl || !status.hasAnyPublicKey
      ? "Copia .env.local.example → .env.local, pega URL + PUBLISHABLE_KEY (o ANON_KEY), reinicia npm run dev."
      : "Env pública OK. SERVICE_ROLE no hace falta para login.",
  });
}
