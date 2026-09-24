"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientPaymentAction } from "@/app/actions/client-payments";
import { deleteConsignmentAction } from "@/app/actions/consignments";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import { PencilIcon } from "@/components/ui/pencil-icon";
import type { ProfileRef, VentaPayment, VentaRow } from "@/lib/data-types";
import {
  PAYMENT_METHOD_LABEL,
  formatBs,
  formatDateTimeLaPaz,
  formatVentaTitle,
  paymentLabel,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type Props = {
  venta: VentaRow;
  canEdit: boolean;
  canDelete: boolean;
};

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9l1-13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function personEmail(p?: ProfileRef | null) {
  return p?.email || p?.username || p?.full_name || "—";
}

/** Solo dígitos y un decimal, con hasta dos centavos. */
function moneyInput(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  const whole = cleaned.slice(0, dot);
  const decimals = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${whole}.${decimals}`;
}

export function VentaDetail({ venta, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addedPayments, setAddedPayments] = useState<VentaPayment[]>([]);
  const payRef = useRef<HTMLDialogElement>(null);
  const noticeRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  const paymentsChrono = useMemo(() => {
    const known = new Set(venta.payments.map((payment) => payment.id));
    const extras = addedPayments.filter((payment) => !known.has(payment.id));
    return [...venta.payments, ...extras].sort((a, b) =>
      a.paid_at < b.paid_at ? -1 : a.paid_at > b.paid_at ? 1 : 0,
    );
  }, [venta.payments, addedPayments]);

  const pendingLeft = useMemo(() => {
    const known = new Set(venta.payments.map((payment) => payment.id));
    const extraPaid = addedPayments
      .filter((payment) => !known.has(payment.id))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return Math.max(0, Math.round((venta.pending_amount - extraPaid) * 100) / 100);
  }, [venta.payments, venta.pending_amount, addedPayments]);

  const amountNum = Number(amount);
  const canPay =
    amount.trim() !== "" &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    amountNum <= pendingLeft + 0.001 &&
    !pending;

  useEffect(() => {
    const dialog = noticeRef.current;
    if (!notice || !dialog || dialog.open) return;
    dialog.showModal();
  }, [notice]);

  function closeNotice() {
    noticeRef.current?.close();
  }

  function openPay() {
    const due = Math.round(pendingLeft * 100) / 100;
    setAmount(due > 0 ? String(due) : "");
    setMethod("cash");
    setFeedback(null);
    if (payRef.current && !payRef.current.open) payRef.current.showModal();
  }

  function closePay() {
    payRef.current?.close();
  }

  function openDelete() {
    setDeleteFeedback(null);
    if (deleteRef.current && !deleteRef.current.open) deleteRef.current.showModal();
  }

  function closeDelete() {
    deleteRef.current?.close();
  }

  function onDelete() {
    setDeleteFeedback(null);
    startTransition(async () => {
      const result = await deleteConsignmentAction(venta.id);
      if (!result.ok) {
        setDeleteFeedback(result.message);
        return;
      }
      deleteRef.current?.close();
      router.push("/ventas");
      router.refresh();
    });
  }

  function onPagar(e: FormEvent) {
    e.preventDefault();
    if (!canPay) {
      setFeedback("El monto no puede superar el saldo pendiente.");
      return;
    }
    startTransition(async () => {
      const result = await createClientPaymentAction({
        client_id: venta.client_id,
        consignment_id: venta.id,
        amount: Number(amount),
        method,
        notes: "",
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback(null);
      if (result.paymentId) {
        setAddedPayments((current) => [
          {
            id: result.paymentId as string,
            amount: Number(amount),
            method,
            paid_at: result.paidAt ?? new Date().toISOString(),
            recorded_by: null,
          },
          ...current,
        ]);
      }
      payRef.current?.close();
      setNotice(result.message);
      router.refresh();
    });
  }

  return (
    <div className="data-stack">
      <header className="venta-detail-header">
        <div className="venta-detail-title-row">
          <Link
            href="/ventas"
            className="btn-icon-back"
            aria-label="Volver"
            title="Volver"
          >
            <BackArrowIcon />
          </Link>
          <h2 className="module-title">{formatVentaTitle(venta.sale_number)}</h2>
          {canEdit ? (
            <Link
              href={`/ventas/${venta.id}/editar`}
              className="btn-icon-edit"
              aria-label="Editar venta"
              title="Editar"
            >
              <PencilIcon />
            </Link>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="btn-icon-delete"
              aria-label="Eliminar venta"
              title="Eliminar"
              onClick={openDelete}
              disabled={pending}
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
        <p className="data-card-meta">
          {formatDateTimeLaPaz(venta.created_at)}
        </p>
      </header>

      <section className="data-form venta-detail-meta">
        <p className="data-card-title">{venta.clients?.name ?? "Cliente"}</p>
        <p className="data-card-meta">
          {venta.clients?.phone || "Sin celular"}
          {venta.clients?.zone ? ` · ${venta.clients.zone}` : ""}
        </p>
        <p className="data-card-meta">
          Cantidad: {venta.quantity_birds}
          {" · "}
          Precio: {formatBs(venta.unit_price)}
          {" · "}
          Total: {formatBs(venta.total_amount)}
        </p>
        {pendingLeft > 0.001 ? (
          <p className="venta-pending-banner">
            <span>Pendiente de pago</span>
            <strong>{formatBs(pendingLeft)}</strong>
          </p>
        ) : (
          <p className="compra-status-tag is-paid venta-paid-banner">Pagado</p>
        )}
        <p className="data-card-meta">
          Registrado por: {personEmail(venta.creator)}
        </p>
        {venta.notes ? (
          <p className="data-card-meta">Notas: {venta.notes}</p>
        ) : null}
      </section>

      <section className="data-form">
        <h3 className="data-form-title">Pagos</h3>
        <ul className="venta-pay-list">
          {paymentsChrono.map((p, i) => (
            <li key={p.id} className="venta-pay-item">
              <div>
                <p className="data-card-title">
                  {paymentLabel(paymentsChrono, i, venta.total_amount)}
                  {" · "}
                  {formatBs(p.amount)}
                </p>
                <p className="data-card-meta">
                  {formatDateTimeLaPaz(p.paid_at)} ·{" "}
                  {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                </p>
                <p className="data-card-meta">
                  Por: {personEmail(p.recorder)}
                </p>
              </div>
            </li>
          ))}
          {paymentsChrono.length === 0 ? (
            <li className="data-empty">
              <p className="data-empty-title">Sin pagos</p>
              <p>Cuando registres un cobro, aparecerá aquí.</p>
            </li>
          ) : null}
        </ul>
      </section>

      <dialog
        ref={noticeRef}
        className="pay-dialog"
        aria-labelledby="venta-cobro-notice-title"
        onClose={() => setNotice(null)}
      >
        <div className="pay-dialog-form">
          <h3 id="venta-cobro-notice-title" className="data-form-title">
            Cobro
          </h3>
          <p className="data-card-meta">{notice}</p>
          <div className="module-form-actions">
            <button type="button" className="btn-primary" onClick={closeNotice}>
              Listo
            </button>
          </div>
        </div>
      </dialog>

      {pendingLeft > 0.001 ? (
        <button type="button" className="btn-primary btn-form" onClick={openPay}>
          Pagar
        </button>
      ) : null}

      <dialog
        ref={payRef}
        className="pay-dialog"
        aria-labelledby="venta-pay-title"
        onClick={(event) => {
          if (event.target === payRef.current) closePay();
        }}
      >
        <form className="data-form pay-dialog-form" onSubmit={onPagar}>
          <h3 id="venta-pay-title" className="data-form-title">
            Pagar
          </h3>
          <p className="venta-pending-banner">
            <span>Pendiente de pago</span>
            <strong>{formatBs(pendingLeft)}</strong>
          </p>
          <div className="field">
            <label htmlFor="vd-amt">Monto (Bs)</label>
            <input
              id="vd-amt"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              required
              value={amount}
              onChange={(event) => setAmount(moneyInput(event.target.value))}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="vd-method">Método</label>
            <select
              id="vd-method"
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
              disabled={pending}
            >
              <option value="cash">Efectivo</option>
              <option value="qr">QR</option>
            </select>
          </div>
          <div className="form-actions form-actions-split">
            <button
              type="button"
              className="btn-secondary btn-form"
              onClick={closePay}
              disabled={pending}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary btn-form" disabled={!canPay}>
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
        aria-labelledby="delete-venta-title"
        onClick={(event) => {
          if (event.target === deleteRef.current) closeDelete();
        }}
      >
        <div className="pay-dialog-form">
          <h3 id="delete-venta-title" className="data-form-title">
            Eliminar venta
          </h3>
          <p className="data-card-meta">
            Se borrará esta venta y sus cobros. Las aves vuelven al stock.
          </p>
          <div className="form-actions form-actions-split">
            <button
              type="button"
              className="btn-secondary btn-form"
              onClick={closeDelete}
              disabled={pending}
            >
              Cancelar
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
