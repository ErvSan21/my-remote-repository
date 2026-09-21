"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  createPurchaseAction,
  updatePurchaseAction,
} from "@/app/actions/purchases";
import type { Purchase, Supplier } from "@/lib/data-types";
import {
  PURCHASE_STATUS_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";

type Props = {
  suppliers: Supplier[];
  purchases: Purchase[];
  listError: string | null;
};

function todayLaPaz() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
}

const emptyForm = {
  id: "",
  supplier_id: "",
  purchase_date: todayLaPaz(),
  quantity_birds: "",
  unit_price: "",
  notes: "",
};

export function PurchasesManager({ suppliers, purchases, listError }: Props) {
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active),
    [suppliers],
  );
  const [form, setForm] = useState({
    ...emptyForm,
    supplier_id: activeSuppliers[0]?.id ?? "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function edit(p: Purchase) {
    setForm({
      id: p.id,
      supplier_id: p.supplier_id,
      purchase_date: p.purchase_date,
      quantity_birds: String(p.quantity_birds),
      unit_price: p.unit_price == null ? "" : String(p.unit_price),
      notes: p.notes || "",
    });
    setFeedback(null);
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      supplier_id: activeSuppliers[0]?.id ?? "",
      purchase_date: todayLaPaz(),
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const qty = Number(form.quantity_birds);
    const priceRaw = form.unit_price.trim();
    const unit_price = priceRaw === "" ? null : Number(priceRaw);

    if (unit_price != null && (!Number.isFinite(unit_price) || unit_price < 0)) {
      setFeedback("Precio inválido.");
      return;
    }

    startTransition(async () => {
      const payload = {
        supplier_id: form.supplier_id,
        purchase_date: form.purchase_date,
        quantity_birds: qty,
        unit_price,
        notes: form.notes,
      };
      const result = form.id
        ? await updatePurchaseAction({ id: form.id, ...payload })
        : await createPurchaseAction(payload);
      setFeedback(result.message);
      if (result.ok) resetForm();
    });
  }

  return (
    <div className="data-stack">
      <header className="data-header">
        <div>
          <h2 className="module-title">Compras</h2>
          <p className="module-desc">
            Registra cantidad ahora; el precio puede quedar pendiente hasta
            negociar.
          </p>
        </div>
      </header>

      {listError ? <p className="module-note">{listError}</p> : null}

      <form className="data-form" onSubmit={onSubmit}>
        <h3 className="data-form-title">
          {form.id ? "Editar compra" : "Nueva compra"}
        </h3>
        <div className="field">
          <label htmlFor="pur-supplier">Proveedor</label>
          <select
            id="pur-supplier"
            required
            value={form.supplier_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, supplier_id: e.target.value }))
            }
            disabled={pending || activeSuppliers.length === 0}
          >
            {activeSuppliers.length === 0 ? (
              <option value="">Crea un proveedor primero</option>
            ) : null}
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pur-date">Fecha</label>
            <input
              id="pur-date"
              type="date"
              required
              value={form.purchase_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchase_date: e.target.value }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="pur-qty">Cantidad (aves)</label>
            <input
              id="pur-qty"
              type="number"
              min={1}
              step={1}
              required
              value={form.quantity_birds}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity_birds: e.target.value }))
              }
              disabled={pending}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pur-price">
            Precio unitario (Bs) — opcional
          </label>
          <input
            id="pur-price"
            type="number"
            min={0}
            step="0.01"
            placeholder="Dejar vacío si aún se negocia"
            value={form.unit_price}
            onChange={(e) =>
              setForm((f) => ({ ...f, unit_price: e.target.value }))
            }
            disabled={pending}
          />
        </div>
        <div className="field">
          <label htmlFor="pur-notes">Notas</label>
          <textarea
            id="pur-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            disabled={pending}
          />
        </div>
        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={pending || activeSuppliers.length === 0}
          >
            {pending ? "Guardando…" : form.id ? "Guardar" : "Registrar compra"}
          </button>
          {form.id ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForm}
              disabled={pending}
            >
              Cancelar
            </button>
          ) : null}
        </div>
        {feedback ? <p className="login-hint">{feedback}</p> : null}
      </form>

      <ul className="data-list">
        {purchases.map((p) => (
          <li key={p.id} className="data-card">
            <div className="data-card-top">
              <div>
                <p className="data-card-title">
                  {p.suppliers?.name ?? "Proveedor"}
                </p>
                <p className="data-card-meta">
                  {formatDateLaPaz(p.purchase_date)} · {p.quantity_birds} aves
                </p>
              </div>
              <span
                className={`status-pill status-${p.status}`}
              >
                {PURCHASE_STATUS_LABEL[p.status] ?? p.status}
              </span>
            </div>
            <p className="data-card-meta">
              Precio:{" "}
              {p.unit_price == null ? "pendiente" : formatBs(p.unit_price)}
              {" · "}
              Total: {formatBs(p.total_amount)}
            </p>
            {p.notes ? <p className="data-card-notes">{p.notes}</p> : null}
            <div className="data-card-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => edit(p)}
                disabled={pending}
              >
                {p.unit_price == null ? "Fijar precio" : "Editar"}
              </button>
            </div>
          </li>
        ))}
        {purchases.length === 0 ? (
          <li className="data-empty">No hay compras registradas.</li>
        ) : null}
      </ul>
    </div>
  );
}
