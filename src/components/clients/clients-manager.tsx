"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { upsertClientAction } from "@/app/actions/clients";
import type { Client } from "@/lib/data-types";
import { CLIENT_ZONES } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
import { phoneDigits } from "@/lib/validation";

type Props = {
  clients: Client[];
  listError: string | null;
};

const emptyClient = {
  id: "" as string,
  name: "",
  zone: "",
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
  const { shown, more } = useLoadMore(query);

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
        addLabel="Nuevo cliente"
        showAdd={!showForm}
        onBack={showForm ? resetForm : undefined}
        onAdd={() => {
          setForm(emptyClient);
          setShowForm(true);
          setFeedback(null);
        }}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form module-form" onSubmit={onSubmit}>
          <h3 className="data-form-title module-form-title">
            {editing ? "Editar cliente" : "Nuevo cliente"}
          </h3>
          <div className="field">
            <label className="sr-only" htmlFor="cl-name">
              Nombre y apellido
            </label>
            <input
              id="cl-name"
              required
              placeholder="Nombre y apellido"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="cl-zone">
              Dirección / zona
            </label>
            <select
              id="cl-zone"
              className={form.zone ? undefined : "is-placeholder"}
              value={form.zone}
              onChange={(e) =>
                setForm((f) => ({ ...f, zone: e.target.value }))
              }
              disabled={pending}
            >
              <option value="">Dirección / zona</option>
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
            <label className="sr-only" htmlFor="cl-phone">
              Celular
            </label>
            <input
              id="cl-phone"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="Celular"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: phoneDigits(e.target.value) }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="cl-notes">
              Notas
            </label>
            <textarea
              id="cl-notes"
              rows={2}
              placeholder="Notas"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="module-form-actions">
            <button
              type="button"
              className="btn-muted"
              onClick={resetForm}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={pending || !form.name.trim()}
            >
              {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
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
            placeholder="Buscar por nombre apellido o celular"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : null}

      {!showForm ? (
      <>
      <ul className="data-list">
        {visible.slice(0, shown).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="data-card provider-card-plain"
              onClick={() => {
                setForm({
                  id: c.id,
                  name: c.name,
                  zone: c.zone || "",
                  phone: phoneDigits(c.phone ?? ""),
                  notes: c.notes ?? "",
                });
                setShowForm(true);
                setFeedback(null);
                setFeedbackOk(false);
              }}
            >
              <p className="data-card-title">{c.name}</p>
              <p className="provider-dept">{c.zone || "Sin dirección"}</p>
              <p className="data-card-meta">{c.phone || "Sin celular"}</p>
            </button>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="data-empty">
            {activeClients.length === 0 ? (
              <>
                <p className="data-empty-title">No hay clientes</p>
                <p>Toca + para agregar el primero.</p>
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
      <LoadMoreButton shown={shown} total={visible.length} onMore={more} />
      </>
      ) : null}
    </div>
  );
}
