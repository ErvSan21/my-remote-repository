"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { createSupplierPaymentAction } from "@/app/actions/supplier-payments";
import type { Purchase, Supplier, SupplierPayment } from "@/lib/data-types";
import type { SupplierDebtSummary } from "@/app/actions/supplier-payments";
import {
  PAYMENT_METHOD_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type Props = {
  suppliers: Supplier[];
  purchases: Purchase[];
  perSupplier: SupplierDebtSummary[];
  totalOwed: number;
  recentPayments: SupplierPayment[];
  listError: string | null;
};

export function SupplierPaymentsManager({
  suppliers,
  purchases,
  perSupplier,
  totalOwed,
  recentPayments,
  listError,
}: Props) {
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active),
    [suppliers],
  );
  const [supplierId, setSupplierId] = useState(activeSuppliers[0]?.id ?? "");
  const [purchaseId, setPurchaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openPurchases = useMemo(
    () =>
      purchases.filter(
        (p) =>
          p.supplier_id === supplierId &&
          p.total_amount != null &&
          p.status !== "paid",
      ),
    [purchases, supplierId],
  );

  const owedSelected =
    perSupplier.find((s) => s.supplier_id === supplierId)?.owed ?? 0;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSupplierPaymentAction({
        supplier_id: supplierId,
        purchase_id: purchaseId || null,
        amount: Number(amount),
        method,
        notes,
      });
      setFeedback(result.message);
      if (result.ok) {
        setAmount("");
        setNotes("");
        setPurchaseId("");
      }
    });
  }

  return (
    <div className="data-stack">
      <header className="data-header">
        <div>
          <h2 className="module-title">Pagos a proveedores</h2>
          <p className="module-desc">
            Pagos parciales o totales. Puedes asignar a una compra o dejar a
            cuenta del proveedor.
          </p>
        </div>
        <div className="debt-total">
          <span>Deuda total</span>
          <strong>{formatBs(totalOwed)}</strong>
        </div>
      </header>

      {listError ? <p className="module-note">{listError}</p> : null}

      <section className="debt-grid" aria-label="Deuda por proveedor">
        {perSupplier.map((row) => (
          <button
            key={row.supplier_id}
            type="button"
            className={`debt-chip ${supplierId === row.supplier_id ? "is-active" : ""}`}
            onClick={() => {
              setSupplierId(row.supplier_id);
              setPurchaseId("");
            }}
          >
            <span>{row.supplier_name}</span>
            <strong>{formatBs(row.owed)}</strong>
          </button>
        ))}
        {perSupplier.length === 0 ? (
          <p className="data-empty">Sin proveedores.</p>
        ) : null}
      </section>

      <form className="data-form" onSubmit={onSubmit}>
        <h3 className="data-form-title">Registrar pago</h3>
        <p className="module-desc">
          Debe este proveedor: <strong>{formatBs(owedSelected)}</strong>
        </p>
        <div className="field">
          <label htmlFor="pay-supplier">Proveedor</label>
          <select
            id="pay-supplier"
            required
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPurchaseId("");
            }}
            disabled={pending || activeSuppliers.length === 0}
          >
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pay-purchase">Compra (opcional)</label>
          <select
            id="pay-purchase"
            value={purchaseId}
            onChange={(e) => setPurchaseId(e.target.value)}
            disabled={pending}
          >
            <option value="">A cuenta del proveedor</option>
            {openPurchases.map((p) => (
              <option key={p.id} value={p.id}>
                {formatDateLaPaz(p.purchase_date)} · {p.quantity_birds} aves ·{" "}
                {formatBs(p.total_amount)} ({p.status})
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pay-amount">Monto (Bs)</label>
            <input
              id="pay-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="pay-method">Método</label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              disabled={pending}
            >
              <option value="cash">Efectivo</option>
              <option value="qr">QR</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pay-notes">Notas</label>
          <textarea
            id="pay-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={pending || !supplierId}
        >
          {pending ? "Guardando…" : "Registrar pago"}
        </button>
        {feedback ? <p className="login-hint">{feedback}</p> : null}
      </form>

      <h3 className="data-form-title">Pagos recientes</h3>
      <ul className="data-list">
        {recentPayments.map((p) => (
          <li key={p.id} className="data-card">
            <div className="data-card-top">
              <div>
                <p className="data-card-title">
                  {p.suppliers?.name ?? "Proveedor"}
                </p>
                <p className="data-card-meta">
                  {formatDateLaPaz(p.paid_at)} ·{" "}
                  {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                  {p.purchase_id ? " · a compra" : " · a cuenta"}
                </p>
              </div>
              <p className="data-card-amount">{formatBs(p.amount)}</p>
            </div>
          </li>
        ))}
        {recentPayments.length === 0 ? (
          <li className="data-empty">Aún no hay pagos.</li>
        ) : null}
      </ul>
    </div>
  );
}
