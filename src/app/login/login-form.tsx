"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccessPath, homePathForRole } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

type LoginFormProps = {
  nextPath?: string;
  setupMissing?: boolean;
  accountDisabled?: boolean;
};

export function LoginForm({
  nextPath,
  setupMissing,
  accountDisabled,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(() => {
    if (setupMissing) {
      return "Faltan las variables de Supabase en este entorno. Copia .env.local.example → .env.local (o configúralas en Vercel) y reinicia el servidor.";
    }
    if (accountDisabled) {
      return "Tu cuenta está desactivada. Contacta a un administrador.";
    }
    return null;
  });
  const [pending, setPending] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !pending && !setupMissing,
    [email, password, pending, setupMissing],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setMessage(null);

    try {
      const supabase = createClient();
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

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <h2>Ingresar</h2>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          required
          disabled={setupMissing || pending}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={setupMissing || pending}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={!canSubmit}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      {message ? <p className="login-hint">{message}</p> : null}
      <p className="login-hint">
        ¿Primera vez? Crea el usuario en Supabase Auth y en{" "}
        <code>profiles</code> pon <code>role = superadmin</code>. La migración
        SQL ya está aplicada. Detalle: checklist en docs del proyecto.
      </p>
    </form>
  );
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirma tu email en Supabase (o desactiva confirmación en Auth → Providers).";
  }
  return message;
}
