"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changePasswordAction,
  updateOwnPhoneAction,
} from "@/app/actions/profile";
import { PencilIcon } from "@/components/ui/pencil-icon";
import { phoneDigits } from "@/lib/validation";

type Props = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

function show(value: string) {
  return value.trim() ? value : "—";
}

export function ProfileForm({ firstName, lastName, email, phone }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [celular, setCelular] = useState(phone);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [phoneOk, setPhoneOk] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);
  const [phonePending, startPhone] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  function openEdit() {
    setCelular(phone);
    setPhoneMessage(null);
    setChangingPassword(false);
    setEditing(true);
  }

  function closeEdit() {
    setCelular(phone);
    setPhoneMessage(null);
    setEditing(false);
  }

  function openPassword() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setPasswordMessage(null);
    setChangingPassword(true);
  }

  function closePassword() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setPasswordMessage(null);
    setChangingPassword(false);
  }

  function savePhone(event: FormEvent) {
    event.preventDefault();
    startPhone(async () => {
      const result = await updateOwnPhoneAction(celular);
      setPhoneOk(result.ok);
      setPhoneMessage(result.message);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function savePassword(event: FormEvent) {
    event.preventDefault();
    startPassword(async () => {
      const result = await changePasswordAction({ current, next, confirm });
      setPasswordOk(result.ok);
      setPasswordMessage(result.message);
      if (result.ok) {
        setCurrent("");
        setNext("");
        setConfirm("");
        setChangingPassword(false);
      }
    });
  }

  return (
    <div className="module-page">
      <header className="module-hero">
        <h1 className="module-hero-title">Perfil</h1>
      </header>

      {!editing ? (
        <section className="proveedor-summary profile-summary">
          <dl className="profile-facts">
            <div>
              <dt>Nombre</dt>
              <dd>{show(firstName)}</dd>
            </div>
            <div>
              <dt>Apellido</dt>
              <dd>{show(lastName)}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{show(email)}</dd>
            </div>
            <div>
              <dt>Celular</dt>
              <dd>{show(phone)}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="proveedor-icon-btn is-edit"
            aria-label="Editar perfil"
            title="Editar"
            onClick={openEdit}
          >
            <PencilIcon size={16} />
          </button>
        </section>
      ) : null}

      {!editing && !changingPassword ? (
        <button type="button" className="profile-password-link" onClick={openPassword}>
          Cambiar contraseña
        </button>
      ) : null}

      {!editing && changingPassword ? (
        <form className="data-form module-form" onSubmit={savePassword}>
          <h2 className="module-form-title">Cambiar contraseña</h2>
          <div className="field">
            <label className="sr-only" htmlFor="perfil-actual">
              Contraseña actual
            </label>
            <input
              id="perfil-actual"
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña actual"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="perfil-nueva">
              Nueva contraseña
            </label>
            <input
              id="perfil-nueva"
              type="password"
              autoComplete="new-password"
              placeholder="Nueva contraseña"
              value={next}
              onChange={(event) => setNext(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="perfil-confirmar">
              Confirmar contraseña
            </label>
            <input
              id="perfil-confirmar"
              type="password"
              autoComplete="new-password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <div className="module-form-actions">
            <button
              type="button"
              className="btn-muted"
              onClick={closePassword}
              disabled={passwordPending}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={passwordPending}>
              {passwordPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {passwordMessage ? (
            <p className={passwordOk ? "login-hint" : "form-feedback"} role="status">
              {passwordMessage}
            </p>
          ) : null}
        </form>
      ) : null}

      {editing ? (
          <form className="data-form module-form" onSubmit={savePhone}>
            <h2 className="module-form-title">Datos</h2>
            <div className="field">
              <label htmlFor="perfil-nombre">Nombre</label>
              <input id="perfil-nombre" value={firstName} readOnly />
            </div>
            <div className="field">
              <label htmlFor="perfil-apellido">Apellido</label>
              <input id="perfil-apellido" value={lastName} readOnly />
            </div>
            <div className="field">
              <label htmlFor="perfil-correo">Correo</label>
              <input id="perfil-correo" type="email" value={email} readOnly />
            </div>
            <div className="field">
              <label htmlFor="perfil-celular">Celular</label>
              <input
                id="perfil-celular"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="Celular"
                value={celular}
                onChange={(event) => setCelular(phoneDigits(event.target.value))}
              />
            </div>
            <div className="module-form-actions">
              <button
                type="button"
                className="btn-muted"
                onClick={closeEdit}
                disabled={phonePending}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={phonePending}>
                {phonePending ? "Guardando…" : "Guardar"}
              </button>
            </div>
            {phoneMessage ? (
              <p className={phoneOk ? "login-hint" : "form-feedback"} role="status">
                {phoneMessage}
              </p>
            ) : null}
          </form>
      ) : null}
    </div>
  );
}
