"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  createSupplierPaymentAction,
  updateSupplierPaymentAction,
} from "@/app/actions/supplier-payments";
import type { Purchase, Supplier, SupplierPayment } from "@/lib/data-types";
import type { SupplierDebtSummary } from "@/app/actions/supplier-payments";
import {
  PAYMENT_METHOD_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";

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
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState("");
  const [supplierId, setSupplierId] = useState(activeSuppliers[0]?.id ?? "");
  const [purchaseId, setPurchaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(editId);
  const { shown, more } = useLoadMore("pagos");

  const openPurchases = useMemo(() => {
    const open = purchases.filter(
      (p) =>
        p.supplier_id === supplierId &&
        p.total_amount != null &&
        p.status !== "paid",
    );
    if (!purchaseId) return open;
    const current = purchases.find((p) => p.id === purchaseId);
    if (current && !open.some((p) => p.id === current.id)) {
      return [current, ...open];
    }
    return open;
  }, [purchases, supplierId, purchaseId]);

  function resetForm() {
    setEditId("");
    setSupplierId(activeSuppliers[0]?.id ?? "");
    setPurchaseId("");
    setAmount("");
    setMethod("cash");
    setNotes("");
    setShowForm(false);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
    setFeedback(null);
  }

  function openEdit(p: SupplierPayment) {
    setEditId(p.id);
    setSupplierId(p.supplier_id);
    setPurchaseId(p.purchase_id ?? "");
    setAmount(String(p.amount));
    setMethod(p.method === "qr" ? "qr" : "cash");
    setNotes(p.notes ?? "");
    setShowForm(true);
    setFeedback(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        supplier_id: supplierId,
        purchase_id: purchaseId || null,
        amount: Number(amount),
        method,
        notes,
      };
      const result = editId
        ? await updateSupplierPaymentAction({ id: editId, ...payload })
        : await createSupplierPaymentAction(payload);
      setFeedback(result.message);
      if (result.ok) resetForm();
    });
  }

  return (
    <div className="data-stack module-page">
      <PageHeader
        variant="hero"
        title="Pagos"
        addLabel="Nuevo pago"
        showAdd={!showForm}
        onBack={showForm ? resetForm : undefined}
        onAdd={openCreate}
      />
      {!showForm ? (
        <p className="module-note">Deuda: {formatBs(totalOwed)}</p>
      ) : null}

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form module-form" onSubmit={onSubmit}>
          <h3 className="data-form-title module-form-title">
            {editing ? "Editar pago" : "Nuevo pago"}
          </h3>
          <div className="field">
            <label className="sr-only" htmlFor="pay-supplier">
              Proveedor
            </label>
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
            <label className="sr-only" htmlFor="pay-purchase">
              Compra
            </label>
            <select
              id="pay-purchase"
              value={purchaseId}
              onChange={(e) => setPurchaseId(e.target.value)}
              disabled={pending}
            >
              <option value="">A cuenta del proveedor</option>
              {openPurchases.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDateLaPaz(p.purchase_date)} · {formatBs(p.total_amount)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pay-amount">
              Monto
            </label>
            <input
              id="pay-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              placeholder="Monto"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pay-method">
              Método
            </label>
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
          <div className="field">
            <label className="sr-only" htmlFor="pay-notes">
              Notas
            </label>
            <textarea
              id="pay-notes"
              rows={2}
              placeholder="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="module-form-actions">
            <button type="button" className="btn-muted" onClick={resetForm}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={pending || !supplierId}
            >
              {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
            </button>
          </div>
          {feedback ? <p className="login-hint">{feedback}</p> : null}
        </form>
      ) : null}

      {!showForm ? (
      <>
      <section className="debt-grid" aria-label="Deuda por proveedor">
        {perSupplier
          .filter((r) => r.owed > 0)
          .map((row) => (
            <div key={row.supplier_id} className="debt-chip">
              <span>{row.supplier_name}</span>
              <strong>{formatBs(row.owed)}</strong>
            </div>
          ))}
      </section>

      <ul className="data-list">
        {recentPayments.slice(0, shown).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="data-card"
              onClick={() => openEdit(p)}
            >
              <div className="data-card-top">
                <div>
                  <p className="data-card-title">
                    {p.suppliers?.name ?? "Proveedor"}
                  </p>
                  <p className="data-card-meta">
                    {formatDateLaPaz(p.paid_at)} ·{" "}
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                  </p>
                </div>
                <p className="proveedor-compra-amount">{formatBs(p.amount)}</p>
              </div>
            </button>
          </li>
        ))}
        {recentPayments.length === 0 ? (
          <li className="data-empty">Aún no hay pagos.</li>
        ) : null}
      </ul>
      <LoadMoreButton shown={shown} total={recentPayments.length} onMore={more} />
      </>
      ) : null}
    </div>
  );
}
