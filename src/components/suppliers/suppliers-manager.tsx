"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createSupplierAction } from "@/app/actions/suppliers";
import type { Supplier } from "@/lib/data-types";
import { BOLIVIA_DEPARTMENTS } from "@/lib/format";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
import { phoneDigits } from "@/lib/validation";

type Props = {
  suppliers: Supplier[];
  listError: string | null;
  initialShowForm?: boolean;
};

const emptyForm = {
  name: "",
  location: "",
  phone: "",
  notes: "",
};

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function SuppliersManager({
  suppliers,
  listError,
  initialShowForm = false,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const { shown, more } = useLoadMore(query);

  const visible = useMemo(() => {
    const active = suppliers.filter((s) => s.active);
    const q = normalize(query.trim());
    if (!q) return active;
    return active.filter((s) => {
      const haystack = normalize(`${s.name} ${s.phone ?? ""} ${s.location ?? ""}`);
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
      const result = await createSupplierAction(form);
      setFeedback(result.message);
      if (result.ok) resetForm();
    });
  }

  return (
    <div className="data-stack module-page">
      <header className="module-hero">
        {showForm ? (
          <button type="button" className="module-hero-back" onClick={resetForm}>
            <BackArrowIcon />
            Proveedores
          </button>
        ) : (
          <div className="module-hero-top">
            <h1 className="module-hero-title">Proveedores</h1>
            <button
              type="button"
              className="btn-plus is-round"
              aria-label="Nuevo proveedor"
              title="Nuevo proveedor"
              onClick={() => {
                setForm(emptyForm);
                setShowForm(true);
                setFeedback(null);
              }}
            >
              +
            </button>
          </div>
        )}
      </header>

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form module-form" onSubmit={onSubmit}>
          <h3 className="data-form-title module-form-title">Nuevo proveedor</h3>
          <div className="field">
            <label className="sr-only" htmlFor="sup-name">
              Nombre y apellido
            </label>
            <input
              id="sup-name"
              required
              placeholder="Nombre y apellido"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="sup-loc">
              Departamento
            </label>
            <select
              id="sup-loc"
              required
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              disabled={pending}
            >
              <option value="" disabled>
                Departamento
              </option>
              {BOLIVIA_DEPARTMENTS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="sup-phone">
              Celular
            </label>
            <input
              id="sup-phone"
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
            <label className="sr-only" htmlFor="sup-notes">
              Notas
            </label>
            <textarea
              id="sup-notes"
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
              disabled={pending || !form.name.trim() || !form.location}
            >
              {pending ? "Guardando…" : "Crear"}
            </button>
          </div>
          {feedback ? (
            <p className="form-feedback" role="alert">
              {feedback}
            </p>
          ) : null}
        </form>
      ) : null}

      {!showForm ? (
        <>
          <div className="search-bar">
            <label htmlFor="sup-search" className="sr-only">
              Buscar proveedor
            </label>
            <input
              id="sup-search"
              type="search"
              placeholder="Buscar por nombre apellido o celular"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <ul className="data-list provider-cards">
            {visible.slice(0, shown).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/proveedores/${s.id}`}
                  className="data-card provider-card provider-card-plain"
                >
                  <p className="data-card-title">{s.name}</p>
                  <p className="provider-dept">
                    {s.location || "Sin departamento"}
                  </p>
                  <p className="data-card-meta">{s.phone || "Sin celular"}</p>
                </Link>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="data-empty">
                {query.trim() ? (
                  <>
                    <p className="data-empty-title">Sin resultados</p>
                    <p>Prueba con otro nombre o celular.</p>
                  </>
                ) : (
                  <>
                    <p className="data-empty-title">No hay proveedores</p>
                    <p>Toca + para agregar el primero.</p>
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
