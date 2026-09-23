"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccessPath, homePathForRole } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

type EnvStatus = {
  hasUrl: boolean;
  hasPublishableKey: boolean;
  hasAnonKey: boolean;
  hasAnyPublicKey: boolean;
  hasServiceRole: boolean;
};

type LoginFormProps = {
  nextPath?: string;
  setupMissing?: boolean;
  accountDisabled?: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  envStatus?: EnvStatus;
};

export function LoginForm({
  nextPath,
  setupMissing,
  accountDisabled,
  supabaseUrl,
  supabaseKey,
  envStatus,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(() => {
    if (setupMissing) {
      return "Faltan las variables de Supabase en este entorno. Revisa .env.local (URL + PUBLISHABLE_KEY o ANON_KEY), reinicia `npm run dev` y abre /login sin ?setup=1.";
    }
    if (accountDisabled) {
      return "Tu cuenta está desactivada. Contacta a un administrador.";
    }
    return null;
  });
  const [pending, setPending] = useState(false);

  const canSubmit = useMemo(
    () =>
      email.trim().length > 0 &&
      password.length > 0 &&
      !pending &&
      !setupMissing,
    [email, password, pending, setupMissing],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setMessage(null);

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(translateAuthError(error.message));
        setPending(false);
        return;
      }

      const userId = data.user?.id;
      let role: AppRole = "vendedora";

      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, active")
          .eq("id", userId)
          .maybeSingle();

        if (profile && profile.active === false) {
          await supabase.auth.signOut();
          setMessage("Tu cuenta está desactivada. Contacta a un administrador.");
          setPending(false);
          return;
        }

        if (profile?.role) {
          role = profile.role as AppRole;
        }
      }

      const preferred =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : null;
      const destination =
        preferred && canAccessPath(preferred, role)
          ? preferred
          : homePathForRole(role);

      router.replace(destination);
      router.refresh();
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : "No se pudo iniciar sesión. Revisa la configuración de Supabase.";
      setMessage(text);
      setPending(false);
    }
  }

  function retryAfterSetup() {
    router.replace("/login");
    router.refresh();
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <h1 className="login-card-title">MAC - Gestión Avícola</h1>

      {setupMissing && envStatus ? (
        <div className="env-status" role="status">
          <p className="env-status-title">Diagnóstico (sin secretos)</p>
          <ul>
            <li>URL: {envStatus.hasUrl ? "OK" : "FALTA"}</li>
            <li>
              PUBLISHABLE_KEY:{" "}
              {envStatus.hasPublishableKey ? "OK" : "FALTA"}
            </li>
            <li>ANON_KEY (fallback): {envStatus.hasAnonKey ? "OK" : "—"}</li>
            <li>
              SERVICE_ROLE:{" "}
              {envStatus.hasServiceRole
                ? "OK (no hace falta para login)"
                : "— (solo para reset password)"}
            </li>
          </ul>
          <button
            type="button"
            className="btn-secondary"
            onClick={retryAfterSetup}
          >
            Ya configuré .env — reintentar
          </button>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="email">Usuario</label>
        <div className="login-input-wrap">
          <span className="login-input-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Usuario"
            required
            disabled={setupMissing || pending}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <div className="login-input-wrap">
          <span className="login-input-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            disabled={setupMissing || pending}
          />
        </div>
      </div>
      <button type="submit" className="btn-primary login-submit" disabled={!canSubmit}>
        {pending ? "Entrando…" : "Ingresar"}
      </button>
      {message ? <p className="login-hint">{message}</p> : null}
    </form>
  );
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirma tu email en Supabase (o desactiva “Confirm email” en Auth → Providers).";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "No se pudo conectar a Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL y tu red.";
  }
  if (lower.includes("jwt") || lower.includes("api key")) {
    return "Key inválida. Usa PUBLISHABLE_KEY (o ANON_KEY), no la service_role en el cliente.";
  }
  return message;
}
