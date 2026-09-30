"use client";

import { FormEvent, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { changePasswordAction, updateOwnProfileAction } from "@/app/actions/profile";
import { Sheet } from "@/components/ui/sheet";
import { initials } from "@/lib/dashboard-model";

type Props = {
  firstName: string;
  lastName: string;
  email: string;
  username: string | null;
  phone: string;
  roleLabel: string;
  isSuperadmin: boolean;
  usersCount: number | null;
};

type Open = "datos" | "clave" | null;

/** Pantalla Perfil del prototipo: tarjeta del usuario y lista de acciones. */
export function ProfileScreen(props: Props) {
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const fullName = [props.firstName, props.lastName].filter(Boolean).join(" ") || props.email;
  const handle = props.username ? `@${props.username}` : props.email;

  function done(message: string) {
    setOpen(null);
    setNotice(message);
  }

  return (
    <div className="data-stack module-page">
      <div className="gv pf">
        <section className="pf-card">
          <span className="pf-avatar" aria-hidden>
            {initials(fullName)}
          </span>
          <div className="pf-card-text">
            <p className="pf-name">{fullName}</p>
            <p className="pf-sub">
              {props.roleLabel} · {handle}
            </p>
            {props.phone ? <p className="pf-sub">Celular {props.phone}</p> : null}
          </div>
        </section>

        {notice ? (
          <p className="pf-notice" role="status">
            {notice}
          </p>
        ) : null}

        <nav className="pf-list" aria-label="Opciones de perfil">
          <button type="button" className="pf-item" onClick={() => setOpen("datos")}>
            <PfIcon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
            <span className="pf-item-label">Editar mis datos</span>
            <Chevron />
          </button>
          <button type="button" className="pf-item" onClick={() => setOpen("clave")}>
            <PfIcon d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2" />
            <span className="pf-item-label">Cambiar contraseña</span>
            <Chevron />
          </button>
          {props.isSuperadmin ? (
            <Link href="/usuarios" className="pf-item">
              <PfIcon d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3" />
              <span className="pf-item-label">Gestionar usuarios</span>
              {props.usersCount != null ? <span className="pf-item-count">{props.usersCount}</span> : null}
              <Chevron />
            </Link>
          ) : null}
          <form action={signOutAction} className="pf-form-item">
            <button type="submit" className="pf-item pf-item-danger">
              <PfIcon d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
              <span className="pf-item-label">Cerrar sesión</span>
            </button>
          </form>
        </nav>
      </div>

      {open === "datos" ? (
        <Sheet title="Mis datos" onClose={close}>
          <MisDatosForm
            firstName={props.firstName}
            lastName={props.lastName}
            phone={props.phone}
            onDone={done}
          />
        </Sheet>
      ) : null}
      {open === "clave" ? (
        <Sheet title="Cambiar contraseña" subtitle="Mínimo 8 caracteres" onClose={close}>
          <ClaveForm onDone={done} />
        </Sheet>
      ) : null}
    </div>
  );
}

function PfIcon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="pf-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function MisDatosForm({
  firstName,
  lastName,
  phone,
  onDone,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  onDone: (m: string) => void;
}) {
  const router = useRouter();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [cel, setCel] = useState(phone);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateOwnProfileAction({ firstName: first, lastName: last, phone: cel });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
      onDone(result.message);
    });
  }

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <div className="rs-grid">
        <div className="rs-field">
          <label className="rs-label" htmlFor="pf-first">
            Nombre
          </label>
          <input id="pf-first" className="rs-input" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
        </div>
        <div className="rs-field">
          <label className="rs-label" htmlFor="pf-last">
            Apellido
          </label>
          <input id="pf-last" className="rs-input" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
        </div>
      </div>
      <div className="rs-field">
        <label className="rs-label" htmlFor="pf-phone">
          Celular
        </label>
        <input
          id="pf-phone"
          className="rs-input"
          inputMode="tel"
          maxLength={8}
          placeholder="8 números"
          value={cel}
          onChange={(e) => setCel(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error ? (
        <p className="rs-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="rs-submit" disabled={pending || !first.trim()}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

function ClaveForm({ onDone }: { onDone: (m: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current.length > 0 && next.length >= 8 && next === confirm;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction({ current, next, confirm });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onDone(result.message);
    });
  }

  const type = show ? "text" : "password";
  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <div className="rs-field">
        <label className="rs-label" htmlFor="pf-cur">
          Contraseña actual
        </label>
        <input id="pf-cur" className="rs-input" type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="rs-field">
        <label className="rs-label" htmlFor="pf-new">
          Nueva contraseña
        </label>
        <input id="pf-new" className="rs-input" type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="rs-field">
        <label className="rs-label" htmlFor="pf-conf">
          Repite la nueva contraseña
        </label>
        <input id="pf-conf" className="rs-input" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <label className="pf-check">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        <span>Mostrar contraseñas</span>
      </label>
      {error || mismatch ? (
        <p className="rs-error" role="alert">
          {error ?? "Las contraseñas nuevas no coinciden."}
        </p>
      ) : null}
      <button type="submit" className="rs-submit" disabled={pending || !valid}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
