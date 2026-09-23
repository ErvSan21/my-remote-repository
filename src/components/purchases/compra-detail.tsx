"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePurchaseAction } from "@/app/actions/purchases";
import { createSupplierPaymentAction } from "@/app/actions/supplier-payments";
import type { ProfileRef, Purchase } from "@/lib/data-types";
import { purchaseBalance } from "@/lib/debts";
import { formatBs, formatDateLaPaz } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import { PencilIcon } from "@/components/ui/pencil-icon";

type Props = {
  purchase: Purchase;
  canEdit: boolean;
};

type PayMode = "partial" | "total";

function personName(person?: ProfileRef | null) {
  return person?.full_name?.trim() || person?.username?.trim() || "—";
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9l1-13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CompraDetail({ purchase, canEdit }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<PayMode>("partial");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const balance = purchaseBalance(purchase.total_amount, purchase.paid_amount ?? 0);
  const title = purchase.suppliers?.name
    ? `Compra · ${purchase.suppliers.name}`
    : "Compra";
  const payAmount =
    mode === "total" ? balance.pending_amount : Number(amount);
  const canSave =
    balance.has_price &&
    balance.pending_amount != null &&
    payAmount != null &&
    Number.isFinite(payAmount) &&
    payAmount > 0 &&
    payAmount <= balance.pending_amount + 0.001 &&
    !pending;

  function openPay() {
    setMode("partial");
    setAmount("");
    setMethod("cash");
    setFeedback(null);
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }

  function closePay() {
    dialogRef.current?.close();
  }

  function openDelete() {
    setDeleteFeedback(null);
    if (deleteRef.current && !deleteRef.current.open) {
      deleteRef.current.showModal();
    }
  }

  function closeDelete() {
    deleteRef.current?.close();
  }

  function onDelete() {
    setDeleteFeedback(null);
    startTransition(async () => {
      const result = await deletePurchaseAction(purchase.id);
      if (!result.ok) {
        setDeleteFeedback(result.message);
        return;
      }
      deleteRef.current?.close();
      router.push("/compras");
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave || payAmount == null || !balance.pending_amount) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await createSupplierPaymentAction({
        supplier_id: purchase.supplier_id,
        purchase_id: purchase.id,
        amount: Math.round(payAmount * 100) / 100,
        method,
        notes: "",
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return (
    <div className="data-stack">
      <header className="venta-detail-header">
        <div className="venta-detail-title-row">
          <Link
            href="/compras"
            className="btn-icon-back"
            aria-label="Volver"
            title="Volver"
          >
            <BackArrowIcon />
          </Link>
          <h2 className="module-title">{title}</h2>
          {canEdit ? (
            <Link
              href={`/compras/${purchase.id}/editar`}
              className="btn-icon-edit"
              aria-label="Editar compra"
              title="Editar"
            >
              <PencilIcon />
            </Link>
          ) : null}
        </div>
      </header>

      <section className="compra-info">
        <div className="compra-info-top">
          <span
            className={
              balance.is_paid
                ? "compra-status-tag is-paid"
                : "compra-status-tag is-pending"
            }
          >
            {balance.is_paid ? "Pagado" : "Pendiente"}
          </span>
          <div className="compra-info-figures">
            <span>{purchase.quantity_birds} pollos</span>
            {purchase.unit_price == null ? (
              <span className="compra-define-price">Definir precio</span>
            ) : (
              <span>{formatBs(purchase.unit_price)}</span>
            )}
          </div>
        </div>
        <p className="compra-info-date">{formatDateLaPaz(purchase.purchase_date)}</p>
        <p className="compra-info-user">{personName(purchase.creator)}</p>
        {purchase.notes ? (
          <p className="data-card-meta compra-info-notes">Notas: {purchase.notes}</p>
        ) : null}
      </section>

      {canEdit || (balance.has_price && !balance.is_paid) ? (
        <div className="compra-action-row">
          {canEdit ? (
            <button
              type="button"
              className="compra-delete-btn"
              onClick={openDelete}
              disabled={pending}
              aria-label="Eliminar compra"
              title="Eliminar"
            >
              <TrashIcon />
            </button>
          ) : null}
          {balance.has_price && !balance.is_paid ? (
            <button type="button" className="btn-primary btn-form" onClick={openPay}>
              Pagar
            </button>
          ) : null}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="pay-dialog"
        aria-labelledby="pay-dialog-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) closePay();
        }}
        onClose={() => setFeedback(null)}
      >
        <form className="data-form pay-dialog-form" onSubmit={onSubmit}>
          <h3 id="pay-dialog-title" className="data-form-title">
            Pagar
          </h3>
          <p className="data-card-meta">
            Pendiente: {formatBs(balance.pending_amount)}
          </p>
          <div className="pay-mode" role="group" aria-label="Tipo de pago">
            <button
              type="button"
              className="pay-mode-btn"
              aria-pressed={mode === "partial"}
              onClick={() => setMode("partial")}
              disabled={pending}
            >
              Pago parcial
            </button>
            <button
              type="button"
              className="pay-mode-btn"
              aria-pressed={mode === "total"}
              onClick={() => {
                setMode("total");
                setAmount(
                  balance.pending_amount == null
                    ? ""
                    : String(balance.pending_amount),
                );
              }}
              disabled={pending}
            >
              Pago total
            </button>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="compra-pay-amt">Monto (Bs)</label>
              <input
                id="compra-pay-amt"
                type="number"
                min={0.01}
                max={balance.pending_amount ?? undefined}
                step="0.01"
                required
                value={mode === "total" ? (balance.pending_amount ?? "") : amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={mode === "total"}
                disabled={pending}
              />
            </div>
            <div className="field">
              <label htmlFor="compra-pay-method">Método</label>
              <select
                id="compra-pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                disabled={pending}
              >
                <option value="cash">Efectivo</option>
                <option value="qr">QR</option>
              </select>
            </div>
          </div>
          <div className="form-actions form-actions-split">
            <button
              type="button"
              className="btn-secondary btn-form"
              onClick={closePay}
              disabled={pending}
            >
              Cerrar
            </button>
            <button type="submit" className="btn-primary btn-form" disabled={!canSave}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {feedback ? (
            <p className="form-feedback" role="alert">
              {feedback}
            </p>
          ) : null}
        </form>
      </dialog>

      <dialog
        ref={deleteRef}
        className="pay-dialog"
        aria-labelledby="delete-dialog-title"
        onClick={(e) => {
          if (e.target === deleteRef.current) closeDelete();
        }}
      >
        <div className="pay-dialog-form">
          <h3 id="delete-dialog-title" className="data-form-title">
            Eliminar compra
          </h3>
          <p className="data-card-meta">
            Se borrará esta compra. Si las aves ya salieron del stock, no se puede eliminar.
          </p>
          <div className="form-actions form-actions-split">
            <button
              type="button"
              className="btn-secondary btn-form"
              onClick={closeDelete}
              disabled={pending}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="btn-danger btn-form"
              onClick={onDelete}
              disabled={pending}
            >
              {pending ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
          {deleteFeedback ? (
            <p className="form-feedback" role="alert">
              {deleteFeedback}
            </p>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
