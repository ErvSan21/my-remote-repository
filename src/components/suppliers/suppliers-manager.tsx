"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { upsertSupplierAction } from "@/app/actions/suppliers";
import type { Supplier } from "@/lib/data-types";
import { BOLIVIA_DEPARTMENTS, formatBs } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

type Props = {
  suppliers: Supplier[];
  debtsBySupplier: Record<string, number>;
  listError: string | null;
};

const emptyForm = {
  id: "" as string,
  name: "",
  location: "Santa Cruz",
  phone: "",
  notes: "",
};

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function SuppliersManager({
  suppliers,
  debtsBySupplier,
  listError,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const active = suppliers.filter((s) => s.active);
    const q = normalize(query.trim());
    if (!q) return active;
    return active.filter((s) => {
      const haystack = normalize(`${s.name} ${s.phone ?? ""}`);
      return haystack.includes(q);
    });
  }, [suppliers, query]);

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
    setFeedback(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertSupplierAction({
        id: form.id || undefined,
        name: form.name,
        location: form.location,
        phone: form.phone,
        notes: form.notes,
      });
      setFeedback(result.message);
      if (result.ok) resetForm();
    });
  }

  return (
    <div className="data-stack">
      <PageHeader
        title="Proveedores"
        addLabel="Crear proveedor"
        showAdd={!showForm}
        onAdd={() => {
          setForm(emptyForm);
          setShowForm(true);
          setFeedback(null);
        }}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form" onSubmit={onSubmit}>
          <h3 className="data-form-title">Crear proveedor</h3>
          <div className="field">
            <label htmlFor="sup-name">Nombre y apellido</label>
            <input
              id="sup-name"
              required
              placeholder="Ej. Juan Pérez"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="sup-loc">Departamento</label>
              <select
                id="sup-loc"
                required
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                disabled={pending}
              >
                {BOLIVIA_DEPARTMENTS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sup-phone">Celular</label>
              <input
                id="sup-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                disabled={pending}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="sup-notes">Notas</label>
            <textarea
              id="sup-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Crear proveedor"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForm}
              disabled={pending}
            >
              Cancelar
            </button>
          </div>
          {feedback ? <p className="login-hint">{feedback}</p> : null}
        </form>
      ) : null}

      {!showForm && feedback ? <p className="login-hint">{feedback}</p> : null}

      <div className="search-bar">
        <label htmlFor="sup-search" className="sr-only">
          Buscar proveedor
        </label>
        <input
          id="sup-search"
          type="search"
          placeholder="Buscar por nombre, apellido o celular…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ul className="data-list provider-cards">
        {visible.map((s) => (
          <li key={s.id} className="data-card provider-card">
            <div className="data-card-top">
              <div>
                <p className="data-card-title">{s.name}</p>
                <p className="provider-dept">
                  {s.location || "Sin departamento"}
                </p>
                {s.phone ? <p className="data-card-meta">{s.phone}</p> : null}
              </div>
              <p className="data-card-amount">
                {formatBs(debtsBySupplier[s.id] ?? 0)}
              </p>
            </div>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="data-empty">
            {query.trim()
              ? "Ningún proveedor coincide con la búsqueda."
              : "No hay proveedores todavía."}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
