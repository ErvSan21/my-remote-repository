"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClientPaymentAction } from "@/app/actions/client-payments";
import type { Client, ClientPayment, Consignment } from "@/lib/data-types";
import {
  PAYMENT_METHOD_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import Link from "next/link";

type Props = {
  clients: Client[];
  consignments: Consignment[];
  payments: ClientPayment[];
  listError: string | null;
  isVendedora: boolean;
};

function receiptFromPayment(p: ClientPayment) {
  const r = p.receipts;
  if (!r) return null;
  return Array.isArray(r) ? r[0] ?? null : r;
}

export function ClientPaymentsManager({
  clients,
  consignments,
  payments,
  listError,
  isVendedora,
}: Props) {
  const router = useRouter();
  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const [clientId, setClientId] = useState(activeClients[0]?.id ?? "");
  const [consignmentId, setConsignmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openForClient = useMemo(
    () =>
      consignments.filter(
        (c) =>
          c.client_id === clientId &&
          (c.status === "open" || c.status === "partial"),
      ),
    [consignments, clientId],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createClientPaymentAction({
        client_id: clientId,
        consignment_id: consignmentId || null,
        amount: Number(amount),
        method,
        notes,
      });
      setFeedback(result.message);
      if (result.ok && result.receiptId) {
        setAmount("");
        setNotes("");
        setConsignmentId("");
        router.push(`/recibos/${result.receiptId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack">
      <header className="data-header">
        <div>
          <h2 className="module-title">
            {isVendedora ? "Registrar cobro" : "Pagos de clientes"}
          </h2>
          <p className="module-desc">
            Cobro QR o efectivo. Al pagar se emite recibo con código único.
            {isVendedora
              ? " No verás deudas de proveedores."
              : ""}
          </p>
        </div>
      </header>

      {listError ? <p className="module-note">{listError}</p> : null}

      <form className="data-form" onSubmit={onSubmit}>
        <h3 className="data-form-title">Nuevo cobro</h3>
        <div className="field">
          <label htmlFor="pay-client">Cliente</label>
          <select
            id="pay-client"
            required
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setConsignmentId("");
            }}
            disabled={pending || activeClients.length === 0}
          >
            {activeClients.length === 0 ? (
              <option value="">Sin clientes — pide a un admin crearlos</option>
            ) : null}
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.zone || "—"})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pay-cons">Consignación (opcional)</label>
          <select
            id="pay-cons"
            value={consignmentId}
            onChange={(e) => setConsignmentId(e.target.value)}
            disabled={pending}
          >
            <option value="">Cobro general / al entregar</option>
            {openForClient.map((c) => (
              <option key={c.id} value={c.id}>
                {formatDateLaPaz(c.left_at)} · {c.quantity_birds} aves ·{" "}
                {formatBs(c.total_amount)} ({c.status})
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pay-amt">Monto (Bs)</label>
            <input
              id="pay-amt"
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
              <option value="on_delivery">Al entregar</option>
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
          disabled={pending || !clientId}
        >
          {pending ? "Registrando…" : "Cobrar y emitir recibo"}
        </button>
        {feedback ? <p className="login-hint">{feedback}</p> : null}
      </form>

      <h3 className="data-form-title">Cobros recientes</h3>
      <ul className="data-list">
        {payments.map((p) => {
          const rec = receiptFromPayment(p);
          return (
            <li key={p.id} className="data-card">
              <div className="data-card-top">
                <div>
                  <p className="data-card-title">
                    {p.clients?.name ?? "Cliente"}
                  </p>
                  <p className="data-card-meta">
                    {formatDateLaPaz(p.paid_at)} ·{" "}
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                    {rec ? ` · ${rec.code}` : ""}
                  </p>
                </div>
                <p className="data-card-amount">{formatBs(p.amount)}</p>
              </div>
              {rec ? (
                <div className="data-card-actions">
                  <Link className="btn-secondary" href={`/recibos/${rec.id}`}>
                    Ver recibo
                  </Link>
                </div>
              ) : null}
            </li>
          );
        })}
        {payments.length === 0 ? (
          <li className="data-empty">Aún no hay cobros.</li>
        ) : null}
      </ul>
    </div>
  );
}
