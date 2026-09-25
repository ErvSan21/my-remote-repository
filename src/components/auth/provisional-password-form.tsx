"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replaceProvisionalPasswordAction } from "@/app/actions/profile";
import { PasswordToggle } from "@/components/ui/password-toggle";
import { homePathForRole } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

type Props = {
  role: AppRole;
  modules: string[] | null;
};

export function ProvisionalPasswordForm({ role, modules }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await replaceProvisionalPasswordAction({
        current,
        next,
        confirm,
      });
      setMessage(result.message);
      if (!result.ok) return;
      router.replace(homePathForRole(role, modules));
      router.refresh();
    });
  }

  return (
    <section className="module-page">
      <header className="module-hero">
        <h1 className="module-hero-title">Cambia tu contraseña</h1>
        <p className="module-hero-sub">
          Esta cuenta tiene una contraseña provisional. Elige una nueva para entrar.
        </p>
      </header>
      <form className="data-form" onSubmit={onSubmit}>
        <PasswordLine
          id="provisional-current"
          label="Contraseña provisional"
          value={current}
          shown={showCurrent}
          autoComplete="current-password"
          onChange={setCurrent}
          onToggle={() => setShowCurrent((value) => !value)}
          disabled={pending}
        />
        <PasswordLine
          id="provisional-next"
          label="Nueva contraseña"
          value={next}
          shown={showNext}
          autoComplete="new-password"
          onChange={setNext}
          onToggle={() => setShowNext((value) => !value)}
          disabled={pending}
        />
        <div className="field">
          <label htmlFor="provisional-confirm">Confirmar contraseña</label>
          <input
            id="provisional-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            minLength={8}
            required
            disabled={pending}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary btn-form" disabled={pending}>
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
        {message ? (
          <p className="form-feedback" role="status">
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function PasswordLine({
  id,
  label,
  value,
  shown,
  autoComplete,
  disabled,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  shown: boolean;
  autoComplete: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="login-input-wrap">
        <input
          id={id}
          className="has-toggle"
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          minLength={8}
          required
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <PasswordToggle shown={shown} onToggle={onToggle} />
      </div>
    </div>
  );
}
