import { LoginForm } from "./login-form";
import { hasSupabasePublicEnv } from "@/lib/env";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; setup?: string; disabled?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const setupMissing = params.setup === "1" || !hasSupabasePublicEnv();

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
      />
    </div>
  );
}
