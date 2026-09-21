import { LoginForm } from "./login-form";
import {
  getPublicEnvStatus,
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabasePublicEnv,
} from "@/lib/env";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; setup?: string; disabled?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  // Solo el estado real de env bloquea el form — no el query ?setup=1 pegajoso.
  const setupMissing = !hasSupabasePublicEnv();
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const envStatus = getPublicEnvStatus();

  return (
    <div className="login-page">
      <div className="login-brand">
        <h1>Sistema Pollo</h1>
        <p>
          Compra en Santa Cruz, Mairana y Cochabamba. Consignación y cobro en La
          Paz y El Alto.
        </p>
      </div>

      <LoginForm
        nextPath={params.next}
        setupMissing={setupMissing}
        accountDisabled={params.disabled === "1"}
        supabaseUrl={url}
        supabaseKey={key}
        envStatus={envStatus}
      />
    </div>
  );
}
