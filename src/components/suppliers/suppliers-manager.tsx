"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  setSupplierActiveAction,
  upsertSupplierAction,
} from "@/app/actions/suppliers";
import type { Supplier } from "@/lib/data-types";
import { SUPPLIER_LOCATIONS, formatBs } from "@/lib/format";

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

export function SuppliersManager({
  suppliers,
  debtsBySupplier,
  listError,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => (showInactive ? suppliers : suppliers.filter((s) => s.active)),
    [suppliers, showInactive],
  );

  function edit(s: Supplier) {
    setForm({
      id: s.id,
      name: s.name,
      location: s.location || "Otro",
      phone: s.phone || "",
      notes: s.notes || "",
    });
    setShowForm(true);
    setFeedback(null);
  }

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

  function toggleActive(s: Supplier) {
    startTransition(async () => {
      const result = await setSupplierActiveAction(s.id, !s.active);
      setFeedback(result.message);
    });
  }

  return (
    <div className="data-stack">
      <header className="data-header">
        <div>
          <h2 className="module-title">Proveedores</h2>
          <p className="module-desc">
            Nombre y departamento. La deuda se calcula con compras con precio
            menos pagos.
          </p>
        </div>
        {!showForm ? (
          <button
            type="button"
            className="btn-primary header-cta"
            onClick={() => {
              setForm(emptyForm);
              setShowForm(true);
              setFeedback(null);
            }}
          >
            Crear proveedor
          </button>
        ) : null}
      </header>

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form" onSubmit={onSubmit}>
          <h3 className="data-form-title">
            {form.id ? "Editar proveedor" : "Crear proveedor"}
          </h3>
          <div className="field">
            <label htmlFor="sup-name">Nombre</label>
            <input
              id="sup-name"
              required
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
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                disabled={pending}
              >
                {SUPPLIER_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sup-phone">Teléfono</label>
              <input
                id="sup-phone"
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
              {pending
                ? "Guardando…"
                : form.id
                  ? "Guardar cambios"
                  : "Crear proveedor"}
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

      <div className="list-toolbar">
        <label className="check-inline">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      <ul className="data-list provider-cards">
        {visible.map((s) => (
          <li key={s.id} className={`data-card provider-card ${s.active ? "" : "is-muted"}`}>
            <div className="data-card-top">
              <div>
                <p className="data-card-title">{s.name}</p>
                <p className="provider-dept">
                  {s.location || "Sin departamento"}
                </p>
                {!s.active ? (
                  <p className="data-card-meta">Inactivo</p>
                ) : null}
              </div>
              <p className="data-card-amount">
                {formatBs(debtsBySupplier[s.id] ?? 0)}
              </p>
            </div>
            <div className="data-card-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => edit(s)}
                disabled={pending}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toggleActive(s)}
                disabled={pending}
              >
                {s.active ? "Desactivar" : "Reactivar"}
              </button>
            </div>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="data-empty">No hay proveedores todavía.</li>
        ) : null}
      </ul>
    </div>
  );
}
