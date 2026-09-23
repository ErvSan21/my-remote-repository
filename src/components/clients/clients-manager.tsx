"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { upsertClientAction } from "@/app/actions/clients";
import type { Client } from "@/lib/data-types";
import { CLIENT_ZONES } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

type Props = {
  clients: Client[];
  listError: string | null;
};

const emptyClient = {
  id: "" as string,
  name: "",
  zone: "La Paz",
  phone: "",
  notes: "",
};

export function ClientsManager({ clients, listError }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const editing = Boolean(form.id);

  function resetForm() {
    setForm(emptyClient);
    setShowForm(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertClientAction({
        id: form.id || undefined,
        name: form.name,
        zone: form.zone,
        phone: form.phone,
        notes: form.notes,
      });
      setFeedback(result.message);
      if (result.ok) resetForm();
    });
  }

  return (
    <div className="data-stack module-page">
      <PageHeader
        variant="hero"
        title="Clientes"
        addLabel="Crear cliente"
        addStyle="button"
        showAdd={!showForm}
        onAdd={() => {
          setForm(emptyClient);
          setShowForm(true);
          setFeedback(null);
        }}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form" onSubmit={onSubmit}>
          <h3 className="data-form-title">
            {editing ? "Editar cliente" : "Nuevo cliente"}
          </h3>
          <div className="field">
            <label htmlFor="cl-name">Nombre</label>
            <input
              id="cl-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="cl-zone">Dirección / zona</label>
              <select
                id="cl-zone"
                value={form.zone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, zone: e.target.value }))
                }
                disabled={pending}
              >
                {CLIENT_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cl-phone">Celular</label>
              <input
                id="cl-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                disabled={pending}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cl-notes">Notas</label>
            <textarea
              id="cl-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={pending}>
              {editing ? "Guardar cambios" : "Crear cliente"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForm}
            >
              Cancelar
            </button>
          </div>
          {feedback ? <p className="login-hint">{feedback}</p> : null}
        </form>
      ) : null}

      {!showForm && feedback ? <p className="login-hint">{feedback}</p> : null}

      <ul className="data-list">
        {activeClients.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="data-card"
              onClick={() => {
                setForm({
                  id: c.id,
                  name: c.name,
                  zone: c.zone || "La Paz",
                  phone: c.phone ?? "",
                  notes: c.notes ?? "",
                });
                setShowForm(true);
                setFeedback(null);
              }}
            >
              <div className="data-card-top">
                <div>
                  <p className="data-card-title">{c.name}</p>
                  <p className="data-card-meta">
                    {c.zone || "Sin dirección"}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
        {activeClients.length === 0 ? (
          <li className="data-empty">No hay clientes.</li>
        ) : null}
      </ul>
    </div>
  );
}
