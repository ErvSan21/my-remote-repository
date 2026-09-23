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
        <div className="login-badge" aria-hidden>
          <svg
            className="login-badge-icon"
            viewBox="0 0 64 64"
            width="40"
            height="40"
            fill="none"
          >
            <path
              d="M18 38c2-10 8-16 14-16s12 6 14 16"
              stroke="#1e293b"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="28" cy="26" r="2.2" fill="#1e293b" />
            <circle cx="36" cy="26" r="2.2" fill="#1e293b" />
            <path
              d="M32 14c2 0 5 2 5 5-3 0-5-1-5-1s-2 1-5 1c0-3 3-5 5-5Z"
              fill="#f97316"
            />
            <path
              d="M22 40c3 6 8 9 10 9s7-3 10-9"
              stroke="#1e293b"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
          <span>MAC</span>
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
