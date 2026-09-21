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
  const setupMissing = !hasSupabasePublicEnv();
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const envStatus = getPublicEnvStatus();

  return (
    <div className="login-page">
      <div className="login-stage">
        <div className="login-brand">
          <p className="login-kicker">MAC</p>
          <h1>Ingresar</h1>
          <p>Operación de pollo en pie — Bolivia.</p>
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
    </div>
  );
}
