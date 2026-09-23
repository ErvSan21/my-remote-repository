"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupplierPaymentAction } from "@/app/actions/supplier-payments";
import type { Purchase } from "@/lib/data-types";
import { purchaseBalance } from "@/lib/debts";
import {
  formatBs,
  formatDateLaPaz,
  formatDateTimeLaPaz,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import { PencilIcon } from "@/components/ui/pencil-icon";

type Props = {
  purchase: Purchase;
  canEdit: boolean;
};

type PayMode = "partial" | "total";

export function CompraDetail({ purchase, canEdit }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<PayMode>("partial");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [feedback, setFeedback] = useState<string | null>(null);
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
        <p className="data-card-meta">
          Registrada:{" "}
          {formatDateTimeLaPaz(purchase.created_at) !== "—"
            ? formatDateTimeLaPaz(purchase.created_at)
            : formatDateLaPaz(purchase.purchase_date)}
        </p>
      </header>

      <section className="data-form">
        <p className="data-card-meta">
          Proveedor: {purchase.suppliers?.name ?? "—"}
        </p>
        <p className="data-card-meta">
          Celular: {purchase.suppliers?.phone || "—"}
        </p>
        <p className="data-card-meta">
          Fecha compra: {formatDateLaPaz(purchase.purchase_date)}
        </p>
        <p className="data-card-meta">Cantidad: {purchase.quantity_birds} pollos</p>
        <p className="data-card-meta">
          Precio unit.:{" "}
          {purchase.unit_price == null
            ? "pendiente"
            : formatBs(purchase.unit_price)}
        </p>
        <p className="data-card-meta">
          {balance.has_price ? (
            <>{formatBs(balance.pending_amount)}</>
          ) : (
            <span className="compra-define-price">Definir precio</span>
          )}
        </p>
        <p className="data-card-meta">
          <span
            className={
              balance.is_paid
                ? "compra-status-tag is-paid"
                : "compra-status-tag is-pending"
            }
          >
            {balance.is_paid ? "Pagado" : "Pendiente"}
          </span>
        </p>
        {purchase.notes ? (
          <p className="data-card-meta">Notas: {purchase.notes}</p>
        ) : null}
      </section>

      {balance.has_price && !balance.is_paid ? (
        <button type="button" className="btn-primary btn-form" onClick={openPay}>
          Cancelar
        </button>
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
            Cancelar compra
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
    </div>
  );
}
