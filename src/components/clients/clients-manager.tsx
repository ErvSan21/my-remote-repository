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

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function ClientsManager({ clients, listError }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return activeClients;
    return activeClients.filter((c) =>
      normalize(`${c.name} ${c.zone ?? ""} ${c.phone ?? ""}`).includes(q),
    );
  }, [activeClients, query]);
  const editing = Boolean(form.id);

  function closeForm() {
    setForm(emptyClient);
    setShowForm(false);
  }

  function resetForm() {
    closeForm();
    setFeedback(null);
    setFeedbackOk(false);
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
      setFeedbackOk(result.ok);
      if (result.ok) closeForm();
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
                {[
                  ...CLIENT_ZONES,
                  ...(form.zone &&
                  !(CLIENT_ZONES as readonly string[]).includes(form.zone)
                    ? [form.zone]
                    : []),
                ].map((z) => (
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
          <div className="form-actions form-actions-split">
            <button
              type="button"
              className="btn-secondary btn-form"
              onClick={resetForm}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary btn-form"
              disabled={pending || !form.name.trim()}
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {feedback ? (
            <p
              className={`form-feedback${feedbackOk ? " is-ok" : ""}`}
              role={feedbackOk ? "status" : "alert"}
            >
              {feedback}
            </p>
          ) : null}
        </form>
      ) : null}

      {!showForm && feedback ? (
        <p
          className={`form-feedback${feedbackOk ? " is-ok" : ""}`}
          role={feedbackOk ? "status" : "alert"}
        >
          {feedback}
        </p>
      ) : null}

      {!showForm ? (
        <div className="search-bar">
          <label htmlFor="cl-search" className="sr-only">
            Buscar cliente
          </label>
          <input
            id="cl-search"
            type="search"
            placeholder="Buscar por nombre, zona o celular…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : null}

      <ul className="data-list">
        {visible.map((c) => (
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
                setFeedbackOk(false);
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
        {visible.length === 0 ? (
          <li className="data-empty">
            {activeClients.length === 0 ? (
              <>
                <p className="data-empty-title">No hay clientes</p>
                <p>Usa «Crear cliente» para agregar el primero.</p>
              </>
            ) : (
              <>
                <p className="data-empty-title">Sin resultados</p>
                <p>Prueba con otro nombre, zona o celular.</p>
              </>
            )}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
