"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { buttonClass, inputClass } from "@/lib/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        Email
        <input className={inputClass} name="email" type="email" autoComplete="username" required />
      </label>
      <label className="grid gap-1 text-sm">
        Contraseña
        <input className={inputClass} name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error ? (
        <p role="alert" className="text-sm text-signal">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} disabled={pending} type="submit">
        {pending ? "Entrando" : "Entrar"}
      </button>
    </form>
  );
}
