"use client";

import { FormEvent, useState, useTransition } from "react";
import { resetPasswordAction, type UserRow } from "@/app/actions/users";

type UsersAdminProps = {
  users: UserRow[];
  listError: string | null;
};

export function UsersAdmin({ users, listError }: UsersAdminProps) {
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onReset(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await resetPasswordAction(selectedId, password);
      setFeedback(result.message);
      if (result.ok) setPassword("");
    });
  }

  return (
    <section className="module-panel">
      <h2 className="module-title">Usuarios</h2>
      <p className="module-desc">
        Solo superadmin. Lista perfiles y resetea contraseñas con la Admin API
        (service role en el servidor).
      </p>

      {listError ? <p className="module-note">{listError}</p> : null}

      {users.length === 0 && !listError ? (
        <p className="module-desc">No hay usuarios todavía.</p>
      ) : null}

      {users.length > 0 ? (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={selectedId === u.id ? "is-selected" : undefined}
                  onClick={() => setSelectedId(u.id)}
                >
                  <td>{u.email ?? "—"}</td>
                  <td>{u.full_name ?? u.username ?? "—"}</td>
                  <td>{u.role}</td>
                  <td>{u.active ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <form className="reset-form" onSubmit={onReset}>
        <h3 className="reset-title">Resetear contraseña</h3>
        <div className="field">
          <label htmlFor="userId">Usuario</label>
          <select
            id="userId"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
            disabled={users.length === 0 || pending}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.email ?? u.full_name ?? u.id) + ` (${u.role})`}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="newPassword">Nueva contraseña</label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={pending || users.length === 0}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={pending || users.length === 0}
        >
          {pending ? "Guardando…" : "Actualizar contraseña"}
        </button>
        {feedback ? <p className="login-hint">{feedback}</p> : null}
      </form>
    </section>
  );
}
