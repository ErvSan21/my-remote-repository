"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientPaymentAction } from "@/app/actions/client-payments";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import { PencilIcon } from "@/components/ui/pencil-icon";
import type { ProfileRef, VentaRow } from "@/lib/data-types";
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
};

function personEmail(p?: ProfileRef | null) {
  return p?.email || p?.username || p?.full_name || "—";
}

export function VentaDetail({ venta, canEdit }: Props) {
  const router = useRouter();
  const [showPagar, setShowPagar] = useState(false);
  const [amount, setAmount] = useState(
    venta.pending_amount > 0
      ? String(Math.round(venta.pending_amount * 100) / 100)
      : "",
  );
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paymentsChrono = useMemo(
    () =>
      [...venta.payments].sort((a, b) =>
        a.paid_at < b.paid_at ? -1 : a.paid_at > b.paid_at ? 1 : 0,
      ),
    [venta.payments],
  );

  function onPagar(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createClientPaymentAction({
        client_id: venta.client_id,
        consignment_id: venta.id,
        amount: Number(amount),
        method,
        notes: "",
      });
      setFeedback(result.message);
      if (result.ok && result.receiptId) {
        router.push(`/recibos/${result.receiptId}`);
        router.refresh();
      } else if (result.ok) {
        setShowPagar(false);
        router.refresh();
      }
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
        <p className="data-card-meta">
          Estado:{" "}
          {venta.is_paid
            ? "Pagado"
            : `Pendiente ${formatBs(venta.pending_amount)}`}
        </p>
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
            <li className="data-empty">Sin pagos registrados.</li>
          ) : null}
        </ul>
      </section>

      {venta.pending_amount > 0.001 ? (
        showPagar ? (
          <form className="data-form" onSubmit={onPagar}>
            <h3 className="data-form-title">Pagar</h3>
            <p className="data-card-meta">
              Pendiente: {formatBs(venta.pending_amount)}
            </p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="vd-amt">Monto (Bs)</label>
                <input
                  id="vd-amt"
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
                <label htmlFor="vd-method">Método</label>
                <select
                  id="vd-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  disabled={pending}
                >
                  <option value="cash">Efectivo</option>
                  <option value="qr">QR</option>
                  <option value="on_delivery">Al entregar</option>
                </select>
              </div>
            </div>
            <div className="form-actions form-actions-split">
              <button
                type="button"
                className="btn-secondary btn-form"
                onClick={() => setShowPagar(false)}
                disabled={pending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary btn-form"
                disabled={pending}
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
            {feedback ? <p className="login-hint">{feedback}</p> : null}
          </form>
        ) : (
          <button
            type="button"
            className="btn-primary btn-form"
            onClick={() => setShowPagar(true)}
          >
            Pagar
          </button>
        )
      ) : null}
    </div>
  );
}
