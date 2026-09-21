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
import { PageHeader } from "@/components/ui/page-header";

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
  const [showForm, setShowForm] = useState(false);
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
        setShowForm(false);
        router.push(`/recibos/${result.receiptId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack">
      <PageHeader
        title={isVendedora ? "Cobros" : "Cobros"}
        addLabel="Registrar cobro"
        showAdd={!showForm}
        onAdd={() => {
          setShowForm(true);
          setFeedback(null);
        }}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
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
                <option value="">Sin clientes</option>
              ) : null}
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              <option value="">Cobro general</option>
              {openForClient.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatDateLaPaz(c.left_at)} · {c.quantity_birds} aves ·{" "}
                  {formatBs(c.total_amount)}
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
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={pending || !clientId}
            >
              {pending ? "Registrando…" : "Cobrar"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
          </div>
          {feedback ? <p className="login-hint">{feedback}</p> : null}
        </form>
      ) : null}

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
