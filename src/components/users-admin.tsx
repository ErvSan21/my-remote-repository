"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  deleteUserAction,
  setProvisionalPasswordAction,
  setUserActiveAction,
  updateUserAccessAction,
  type UserRow,
} from "@/app/actions/users";
import { PageHeader } from "@/components/ui/page-header";
import {
  APP_MODULES,
  effectiveModules,
  modulesAllowedForRole,
  moduleLabel,
  roleLabel,
  ROLE_OPTIONS,
  type AppModule,
} from "@/lib/modules";
import type { AppRole } from "@/lib/types";

type Props = {
  users: UserRow[];
  listError: string | null;
  currentUserId: string;
};

export function UsersAdmin({ users, listError, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [provisional, setProvisional] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [draftRole, setDraftRole] = useState<AppRole>("vendedora");
  const [draftModules, setDraftModules] = useState<AppModule[]>(["ventas"]);
  const [createRole, setCreateRole] = useState<AppRole>("vendedora");
  const [createModules, setCreateModules] = useState<AppModule[]>(["ventas"]);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<UserRow | null>(null);
  const [confirmPassword, setConfirmPassword] = useState<UserRow | null>(null);

  const createRef = useRef<HTMLDialogElement>(null);
  const editRef = useRef<HTMLDialogElement>(null);
  const passwordAskRef = useRef<HTMLDialogElement>(null);
  const passwordRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const blockRef = useRef<HTMLDialogElement>(null);

  function show(result: { ok: boolean; message: string; password?: string }) {
    setFeedback(result.message);
    setFeedbackOk(result.ok);
    if (result.password) {
      setProvisional(result.password);
      passwordRef.current?.showModal();
      return;
    }
    if (result.ok) router.refresh();
  }

  function openCreate() {
    setCreateRole("vendedora");
    setCreateModules(modulesAllowedForRole("vendedora"));
    setFeedback(null);
    createRef.current?.showModal();
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setDraftRole(user.role);
    setDraftModules(effectiveModules(user.role, user.enabled_modules));
    setFeedback(null);
    editRef.current?.showModal();
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createUserAction({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        role: createRole,
        modules: createModules,
      });
      show(result);
      if (result.ok) createRef.current?.close();
    });
  }

  function onSaveAccess(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    startTransition(async () => {
      const result = await updateUserAccessAction({
        userId: editing.id,
        role: draftRole,
        modules: draftModules,
      });
      show(result);
      if (result.ok) editRef.current?.close();
    });
  }

  function askProvisional(user: UserRow) {
    setConfirmPassword(user);
    setFeedback(null);
    passwordAskRef.current?.showModal();
  }

  function onConfirmProvisional() {
    if (!confirmPassword) return;
    const userId = confirmPassword.id;
    startTransition(async () => {
      const result = await setProvisionalPasswordAction(userId);
      if (result.ok) {
        passwordAskRef.current?.close();
        setConfirmPassword(null);
      }
      show(result);
    });
  }

  function onConfirmBlock() {
    if (!confirmBlock) return;
    const nextActive = !confirmBlock.active;
    startTransition(async () => {
      const result = await setUserActiveAction(confirmBlock.id, nextActive);
      show(result);
      if (result.ok) {
        blockRef.current?.close();
        setConfirmBlock(null);
      }
    });
  }

  function onConfirmDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      const result = await deleteUserAction(confirmDelete.id);
      show(result);
      if (result.ok) {
        deleteRef.current?.close();
        setConfirmDelete(null);
      }
    });
  }

  async function copyPassword() {
    if (!provisional) return;
    try {
      await navigator.clipboard.writeText(provisional);
      setFeedback("Contraseña copiada.");
      setFeedbackOk(true);
    } catch {
      setFeedback("Selecciona la contraseña y cópiala.");
      setFeedbackOk(false);
    }
  }

  return (
    <section className="module-page">
      <PageHeader
        variant="hero"
        title="Usuarios"
        subtitle="Alta, bloqueo y módulos por rol"
        onAdd={openCreate}
        addLabel="Nuevo usuario"
      />

      {listError ? (
        <p className="form-feedback" role="alert">
          {listError}
        </p>
      ) : null}
      {feedback ? (
        <p className={feedbackOk ? "login-hint" : "form-feedback"} role="status">
          {feedback}
        </p>
      ) : null}

      {users.length === 0 && !listError ? (
        <p className="module-note">Todavía no hay usuarios.</p>
      ) : null}

      <div className="data-list user-list">
        {users.map((user) => {
          const self = user.id === currentUserId;
          const modules = effectiveModules(user.role, user.enabled_modules);
          return (
            <article key={user.id} className="data-card">
              <div className="data-card-top">
                <div>
                  <p className="data-card-title">{user.full_name || "Sin nombre"}</p>
                  <p className="data-card-meta">{user.email || "Sin correo"}</p>
                </div>
                <span className={`user-pill${user.active ? "" : " is-blocked"}`}>
                  {user.active ? roleLabel(user.role) : "Bloqueado"}
                </span>
              </div>
              <p className="data-card-meta user-module-line">
                {modules.length > 0
                  ? modules.map((item) => moduleLabel(item)).join(" · ")
                  : "Sin módulos"}
                {user.must_change_password ? " · Contraseña provisional" : ""}
              </p>
              <div className="user-card-actions">
                <button type="button" className="btn-secondary" onClick={() => openEdit(user)}>
                  Módulos
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={pending}
                  onClick={() => askProvisional(user)}
                >
                  Contraseña
                </button>
                {self ? null : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setConfirmBlock(user);
                      blockRef.current?.showModal();
                    }}
                  >
                    {user.active ? "Bloquear" : "Habilitar"}
                  </button>
                )}
                {self ? null : (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => {
                      setConfirmDelete(user);
                      deleteRef.current?.showModal();
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <dialog
        ref={createRef}
        className="pay-dialog user-dialog"
        aria-labelledby="user-create-title"
        onClick={(event) => {
          if (event.target === createRef.current) createRef.current?.close();
        }}
      >
        <form className="data-form pay-dialog-form" onSubmit={onCreate}>
          <h3 id="user-create-title" className="data-form-title">
            Nuevo usuario
          </h3>
          <div className="field">
            <label htmlFor="user-name">Nombre</label>
            <input id="user-name" name="fullName" required maxLength={120} disabled={pending} />
          </div>
          <div className="field">
            <label htmlFor="user-email">Correo</label>
            <input
              id="user-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              disabled={pending}
            />
          </div>
          <RoleModules
            idPrefix="create"
            role={createRole}
            modules={createModules}
            disabled={pending}
            onRole={(role) => {
              setCreateRole(role);
              setCreateModules(modulesAllowedForRole(role));
            }}
            onModules={setCreateModules}
          />
          <p className="data-card-meta">
            Se genera una contraseña provisional. Al ingresar tendrá que cambiarla.
          </p>
          <div className="module-form-actions">
            <button type="button" className="btn-secondary" onClick={() => createRef.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={editRef}
        className="pay-dialog user-dialog"
        aria-labelledby="user-edit-title"
        onClick={(event) => {
          if (event.target === editRef.current) editRef.current?.close();
        }}
      >
        <form className="data-form pay-dialog-form" onSubmit={onSaveAccess}>
          <h3 id="user-edit-title" className="data-form-title">
            {editing?.full_name || editing?.email || "Usuario"}
          </h3>
          <RoleModules
            idPrefix="edit"
            role={draftRole}
            modules={draftModules}
            disabled={pending}
            lockSuperadmin={editing?.id === currentUserId}
            onRole={(role) => {
              setDraftRole(role);
              setDraftModules(modulesAllowedForRole(role));
            }}
            onModules={setDraftModules}
          />
          <div className="module-form-actions">
            <button type="button" className="btn-secondary" onClick={() => editRef.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={passwordAskRef}
        className="pay-dialog"
        aria-labelledby="user-password-ask-title"
        onClick={(event) => {
          if (event.target === passwordAskRef.current) passwordAskRef.current?.close();
        }}
      >
        <div className="pay-dialog-form">
          <h3 id="user-password-ask-title" className="data-form-title">
            Contraseña provisional
          </h3>
          <p className="data-card-meta">
            Se genera una contraseña nueva para{" "}
            {confirmPassword?.full_name || confirmPassword?.email || "este usuario"}. Si cierras,
            la contraseña actual se queda igual.
          </p>
          <div className="module-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => passwordAskRef.current?.close()}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={onConfirmProvisional}
            >
              {pending ? "Generando…" : "Generar"}
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={passwordRef}
        className="pay-dialog"
        aria-labelledby="user-password-title"
        onClose={() => {
          setProvisional(null);
          router.refresh();
        }}
      >
        <div className="pay-dialog-form">
          <h3 id="user-password-title" className="data-form-title">
            Contraseña provisional
          </h3>
          <p className="data-card-meta">
            Compártela con el usuario. Al ingresar deberá cambiarla.
          </p>
          <input
            className="provisional-password"
            readOnly
            value={provisional ?? ""}
            aria-label="Contraseña provisional"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="module-form-actions">
            <button type="button" className="btn-secondary" onClick={copyPassword}>
              Copiar
            </button>
            <button type="button" className="btn-primary" onClick={() => passwordRef.current?.close()}>
              Listo
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={blockRef} className="pay-dialog" aria-labelledby="user-block-title">
        <div className="pay-dialog-form">
          <h3 id="user-block-title" className="data-form-title">
            {confirmBlock?.active ? "Bloquear usuario" : "Habilitar usuario"}
          </h3>
          <p className="data-card-meta">
            {confirmBlock?.active
              ? `${confirmBlock.full_name || confirmBlock.email} no podrá ingresar.`
              : `${confirmBlock?.full_name || confirmBlock?.email} podrá ingresar de nuevo.`}
          </p>
          <div className="module-form-actions">
            <button type="button" className="btn-secondary" onClick={() => blockRef.current?.close()}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={pending} onClick={onConfirmBlock}>
              {confirmBlock?.active ? "Bloquear" : "Habilitar"}
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={deleteRef} className="pay-dialog" aria-labelledby="user-delete-title">
        <div className="pay-dialog-form">
          <h3 id="user-delete-title" className="data-form-title">
            Eliminar usuario
          </h3>
          <p className="data-card-meta">
            Se borra la cuenta de {confirmDelete?.full_name || confirmDelete?.email}. Esta acción no se deshace.
          </p>
          <div className="module-form-actions">
            <button type="button" className="btn-secondary" onClick={() => deleteRef.current?.close()}>
              Cancelar
            </button>
            <button type="button" className="btn-danger" disabled={pending} onClick={onConfirmDelete}>
              Eliminar
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

function RoleModules({
  idPrefix,
  role,
  modules,
  disabled,
  lockSuperadmin,
  onRole,
  onModules,
}: {
  idPrefix: string;
  role: AppRole;
  modules: AppModule[];
  disabled: boolean;
  lockSuperadmin?: boolean;
  onRole: (role: AppRole) => void;
  onModules: (modules: AppModule[]) => void;
}) {
  const allowed = APP_MODULES.filter((item) => item.roles.includes(role));

  function toggle(key: AppModule) {
    onModules(
      modules.includes(key) ? modules.filter((item) => item !== key) : [...modules, key],
    );
  }

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-role`}>Rol</label>
        <select
          id={`${idPrefix}-role`}
          value={role}
          disabled={disabled || lockSuperadmin}
          onChange={(event) => onRole(event.target.value as AppRole)}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="user-modules" disabled={disabled}>
        <legend>Módulos</legend>
        {allowed.map((item) => (
          <label key={item.key} className="check-inline">
            <input
              type="checkbox"
              checked={modules.includes(item.key)}
              onChange={() => toggle(item.key)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>
    </>
  );
}
