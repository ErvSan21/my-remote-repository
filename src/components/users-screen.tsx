"use client";

import { FormEvent, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  deleteUserAction,
  resetPasswordAction,
  setProvisionalPasswordAction,
  setUserActiveAction,
  updateUserAccessAction,
  updateUserNameAction,
  type UserActionResult,
  type UserRow,
} from "@/app/actions/users";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { initials } from "@/lib/dashboard-model";
import {
  APP_MODULES,
  effectiveModules,
  modulesAllowedForRole,
  roleLabel,
  ROLE_OPTIONS,
  type AppModule,
} from "@/lib/modules";
import type { AppRole } from "@/lib/types";

export type UserStats = { compras: number; ventas: number; cobros: number };

type Props = {
  users: UserRow[];
  stats: Record<string, UserStats>;
  listError: string | null;
  currentUserId: string;
};

type Open = { kind: "nuevo" } | { kind: "editar"; user: UserRow } | { kind: "clave"; password: string; name: string } | null;

const AVATAR: Record<AppRole, string> = {
  superadmin: "is-navy",
  admin: "is-rust",
  vendedora: "is-green",
};

/** Pantalla Usuarios del prototipo: nuevo usuario, tarjetas con interruptor y edición completa. */
export function UsersScreen({ users, stats, listError, currentUserId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const close = useCallback(() => setOpen(null), []);

  function finish(result: UserActionResult, name?: string) {
    setNotice({ ok: result.ok, text: result.message });
    if (!result.ok) return;
    router.refresh();
    if (result.password) setOpen({ kind: "clave", password: result.password, name: name ?? "el usuario" });
    else setOpen(null);
  }

  function toggleActive(user: UserRow) {
    setBusyId(user.id);
    startTransition(async () => {
      const result = await setUserActiveAction(user.id, !user.active);
      setBusyId(null);
      setNotice({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="data-stack module-page">
      <PageHeader variant="hero" title="Usuarios" showAdd={false} onBack={() => router.push("/perfil")} />
      <div className="gv pf">
        <button type="button" className="gv-btn-dark gv-btn-lg pf-new" onClick={() => setOpen({ kind: "nuevo" })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo usuario
        </button>

        {listError ? (
          <p className="rs-error" role="alert">
            {listError}
          </p>
        ) : null}
        {notice && !open ? (
          <p className={notice.ok ? "pf-notice" : "rs-error"} role="status">
            {notice.text}
          </p>
        ) : null}

        <ul className="gv-list pf-users">
          {users.map((user) => {
            const self = user.id === currentUserId;
            const s = stats[user.id] ?? { compras: 0, ventas: 0, cobros: 0 };
            const name = user.full_name || user.email || "Sin nombre";
            return (
              <li key={user.id} className={`gv-card${user.active ? "" : " is-off"}`}>
                <div className="pf-user-top">
                  <span className={`pf-user-avatar ${AVATAR[user.role]}`} aria-hidden>
                    {initials(name)}
                  </span>
                  <button type="button" className="pf-user-main" onClick={() => setOpen({ kind: "editar", user })}>
                    <span className="gv-card-name">
                      {name}
                      {self ? " (tú)" : ""}
                    </span>
                    <span className="gv-card-sub">
                      {user.username ? `@${user.username}` : user.email ?? ""} · {roleLabel(user.role)}
                      {user.active ? "" : " · Bloqueado"}
                    </span>
                  </button>
                  {self ? null : (
                    <button
                      type="button"
                      className={`pf-switch${user.active ? " is-on" : ""}`}
                      aria-label={user.active ? `Bloquear a ${name}` : `Habilitar a ${name}`}
                      aria-pressed={user.active}
                      disabled={busyId === user.id}
                      onClick={() => toggleActive(user)}
                    >
                      <span />
                    </button>
                  )}
                </div>
                <div className="pf-stats">
                  <span>
                    <strong>{s.compras}</strong> compras
                  </span>
                  <span>
                    <strong>{s.ventas}</strong> ventas
                  </span>
                  <span>
                    <strong>{s.cobros}</strong> cobros
                  </span>
                  <button type="button" className="pf-edit" onClick={() => setOpen({ kind: "editar", user })}>
                    Editar
                  </button>
                </div>
                {user.must_change_password ? <p className="pf-flag">Contraseña provisional pendiente</p> : null}
              </li>
            );
          })}
        </ul>
      </div>

      {open?.kind === "nuevo" ? (
        <Sheet title="Nuevo usuario" subtitle="Se genera una contraseña provisional" onClose={close}>
          <NuevoForm onResult={finish} />
        </Sheet>
      ) : null}
      {open?.kind === "editar" ? (
        <Sheet title={open.user.full_name || open.user.email || "Usuario"} subtitle={open.user.email ?? undefined} onClose={close}>
          <EditarForm user={open.user} self={open.user.id === currentUserId} onResult={finish} />
        </Sheet>
      ) : null}
      {open?.kind === "clave" ? (
        <Sheet title="Contraseña provisional" subtitle={`Compártela con ${open.name}. Al ingresar deberá cambiarla.`} onClose={close}>
          <ProvisionalView password={open.password} onClose={close} />
        </Sheet>
      ) : null}
    </div>
  );
}

function RoleChoice({
  role,
  onRole,
  locked,
}: {
  role: AppRole;
  onRole: (role: AppRole) => void;
  locked?: boolean;
}) {
  return (
    <div className="rs-field">
      <span className="rs-label">Rol</span>
      <div className="rs-choice" role="group" aria-label="Rol">
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`rs-choice-btn${role === option.value ? " is-active" : ""}`}
            aria-pressed={role === option.value}
            disabled={locked && option.value !== role}
            onClick={() => onRole(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModuleChoice({
  role,
  modules,
  onModules,
}: {
  role: AppRole;
  modules: AppModule[];
  onModules: (modules: AppModule[]) => void;
}) {
  const allowed = APP_MODULES.filter((item) => item.roles.includes(role));
  return (
    <div className="rs-field">
      <span className="rs-label">Módulos que ve</span>
      <div className="rs-chips" role="group" aria-label="Módulos">
        {allowed.map((item) => {
          const on = modules.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              className={`rs-chip${on ? " is-on" : ""}`}
              aria-pressed={on}
              onClick={() => onModules(on ? modules.filter((m) => m !== item.key) : [...modules, item.key])}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NuevoForm({ onResult }: { onResult: (r: UserActionResult, name?: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("vendedora");
  const [modules, setModules] = useState<AppModule[]>(modulesAllowedForRole("vendedora"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUserAction({ fullName: name, email, role, modules });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onResult(result, name);
    });
  }

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <div className="rs-field">
        <label className="rs-label" htmlFor="nu-name">
          Nombre completo
        </label>
        <input id="nu-name" className="rs-input" placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="rs-field">
        <label className="rs-label" htmlFor="nu-email">
          Correo (para ingresar)
        </label>
        <input id="nu-email" className="rs-input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <RoleChoice
        role={role}
        onRole={(r) => {
          setRole(r);
          setModules(modulesAllowedForRole(r));
        }}
      />
      <ModuleChoice role={role} modules={modules} onModules={setModules} />
      {error ? (
        <p className="rs-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="rs-submit" disabled={pending || !name.trim() || !email.trim()}>
        {pending ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}

function EditarForm({
  user,
  self,
  onResult,
}: {
  user: UserRow;
  self: boolean;
  onResult: (r: UserActionResult, name?: string) => void;
}) {
  const [name, setName] = useState(user.full_name ?? "");
  const [role, setRole] = useState<AppRole>(user.role);
  const [modules, setModules] = useState<AppModule[]>(effectiveModules(user.role, user.enabled_modules));
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const displayName = user.full_name || user.email || "el usuario";

  function run(task: () => Promise<UserActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onResult(result, displayName);
    });
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      if (name.trim() !== (user.full_name ?? "").trim()) {
        const renamed = await updateUserNameAction({ userId: user.id, fullName: name });
        if (!renamed.ok) return renamed;
      }
      return updateUserAccessAction({ userId: user.id, role, modules });
    });
  }

  return (
    <div className="rs-form">
      <form className="rs-form" onSubmit={onSave}>
        <div className="rs-field">
          <label className="rs-label" htmlFor="ed-name">
            Nombre completo
          </label>
          <input id="ed-name" className="rs-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <RoleChoice
          role={role}
          locked={self}
          onRole={(r) => {
            setRole(r);
            setModules(modulesAllowedForRole(r));
          }}
        />
        <ModuleChoice role={role} modules={modules} onModules={setModules} />
        <button type="submit" className="rs-submit" disabled={pending || !name.trim()}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <div className="pf-section">
        <p className="rs-label">Contraseña</p>
        <div className="rs-field">
          <label className="rs-label pf-soft" htmlFor="ed-pass">
            Poner una contraseña nueva (8 a 72 caracteres)
          </label>
          <input
            id="ed-pass"
            className="rs-input"
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="pf-row">
          <button
            type="button"
            className="pf-btn-outline"
            disabled={pending || password.trim().length < 8}
            onClick={() => run(() => resetPasswordAction(user.id, password))}
          >
            Guardar contraseña
          </button>
          <button
            type="button"
            className="pf-btn-outline"
            disabled={pending}
            onClick={() => run(() => setProvisionalPasswordAction(user.id))}
          >
            Generar provisional
          </button>
        </div>
        <p className="pf-soft">En ambos casos deberá cambiarla la próxima vez que ingrese.</p>
      </div>

      {self ? null : (
        <div className="pf-section">
          {confirmDelete ? (
            <div className="pf-row">
              <span className="pf-soft pf-grow">¿Eliminar a {displayName}? No se puede deshacer.</span>
              <button type="button" className="pf-btn-outline" onClick={() => setConfirmDelete(false)}>
                No
              </button>
              <button type="button" className="pf-btn-danger" disabled={pending} onClick={() => run(() => deleteUserAction(user.id))}>
                Sí, eliminar
              </button>
            </div>
          ) : (
            <button type="button" className="pf-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
              Eliminar usuario
            </button>
          )}
        </div>
      )}

      {error ? (
        <p className="rs-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProvisionalView({ password, onClose }: { password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="rs-form">
      <input className="rs-input rs-input-big pf-pass" readOnly value={password} aria-label="Contraseña provisional" onFocus={(e) => e.currentTarget.select()} />
      <div className="pf-row">
        <button type="button" className="pf-btn-outline pf-grow" onClick={copy}>
          {copied ? "Copiada" : "Copiar"}
        </button>
        <button type="button" className="rs-submit pf-grow" onClick={onClose}>
          Listo
        </button>
      </div>
    </div>
  );
}
