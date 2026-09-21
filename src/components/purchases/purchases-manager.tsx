"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { createPurchaseAction } from "@/app/actions/purchases";
import type { Purchase, Supplier } from "@/lib/data-types";
import {
  PURCHASE_STATUS_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

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

export function PurchasesManager({ suppliers, purchases, listError }: Props) {
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active),
    [suppliers],
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    supplier_id: activeSuppliers[0]?.id ?? "",
    purchase_date: todayLaPaz(),
    quantity_birds: "",
    unit_price: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setForm({
      supplier_id: activeSuppliers[0]?.id ?? "",
      purchase_date: todayLaPaz(),
      quantity_birds: "",
      unit_price: "",
      notes: "",
    });
    setShowForm(false);
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
      const result = await createPurchaseAction({
        supplier_id: form.supplier_id,
        purchase_date: form.purchase_date,
        quantity_birds: qty,
        unit_price,
        notes: form.notes,
      });
      setFeedback(result.message);
      if (result.ok) resetForm();
    });
  }

  return (
    <div className="data-stack">
      <PageHeader
        title="Compras"
        addLabel="Registrar compra"
        showAdd={!showForm}
        onAdd={() => {
          setShowForm(true);
          setFeedback(null);
        }}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form" onSubmit={onSubmit}>
          <h3 className="data-form-title">Nueva compra</h3>
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
            <label htmlFor="pur-price">Precio unitario (Bs) — opcional</label>
            <input
              id="pur-price"
              type="number"
              min={0}
              step="0.01"
              placeholder="Vacío = precio pendiente"
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
              {pending ? "Guardando…" : "Registrar compra"}
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
              <span className={`status-pill status-${p.status}`}>
                {PURCHASE_STATUS_LABEL[p.status] ?? p.status}
              </span>
            </div>
            <p className="data-card-meta">
              Precio:{" "}
              {p.unit_price == null ? "pendiente" : formatBs(p.unit_price)}
              {" · "}
              Total: {formatBs(p.total_amount)}
            </p>
          </li>
        ))}
        {purchases.length === 0 ? (
          <li className="data-empty">No hay compras registradas.</li>
        ) : null}
      </ul>
    </div>
  );
}
