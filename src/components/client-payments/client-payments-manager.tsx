"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createClientPaymentAction,
  updateClientPaymentAction,
} from "@/app/actions/client-payments";
import type { Client, ClientPayment, Consignment } from "@/lib/data-types";
import {
  PAYMENT_METHOD_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";

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
}: Props) {
  const router = useRouter();
  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState("");
  const [clientId, setClientId] = useState(activeClients[0]?.id ?? "");
  const [consignmentId, setConsignmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(editId);
  const { shown, more } = useLoadMore("cobros");

  const openForClient = useMemo(() => {
    const open = consignments.filter(
      (c) =>
        c.client_id === clientId &&
        (c.status === "open" || c.status === "partial"),
    );
    if (!consignmentId) return open;
    const current = consignments.find((c) => c.id === consignmentId);
    if (current && !open.some((c) => c.id === current.id)) {
      return [current, ...open];
    }
    return open;
  }, [consignments, clientId, consignmentId]);

  function resetForm() {
    setEditId("");
    setClientId(activeClients[0]?.id ?? "");
    setConsignmentId("");
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

  function openEdit(p: ClientPayment) {
    setEditId(p.id);
    setClientId(p.client_id);
    setConsignmentId(p.consignment_id ?? "");
    setAmount(String(p.amount));
    setMethod(p.method);
    setNotes(p.notes ?? "");
    setShowForm(true);
    setFeedback(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (editId) {
        const result = await updateClientPaymentAction({
          id: editId,
          client_id: clientId,
          consignment_id: consignmentId || null,
          amount: Number(amount),
          method,
          notes,
        });
        setFeedback(result.message);
        if (result.ok) {
          resetForm();
          router.refresh();
        }
        return;
      }

      const result = await createClientPaymentAction({
        client_id: clientId,
        consignment_id: consignmentId || null,
        amount: Number(amount),
        method,
        notes,
      });
      setFeedback(result.message);
      if (result.ok && result.receiptId) {
        resetForm();
        router.push(`/recibos/${result.receiptId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack module-page">
      <PageHeader
        variant="hero"
        title="Cobros"
        addLabel="Nuevo cobro"
        showAdd={!showForm}
        onBack={showForm ? resetForm : undefined}
        onAdd={openCreate}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form module-form" onSubmit={onSubmit}>
          <h3 className="data-form-title module-form-title">
            {editing ? "Editar cobro" : "Nuevo cobro"}
          </h3>
          <div className="field">
            <label className="sr-only" htmlFor="pay-client">
              Cliente
            </label>
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
            <label className="sr-only" htmlFor="pay-cons">
              Consignación
            </label>
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
          <div className="field">
            <label className="sr-only" htmlFor="pay-amt">
              Monto
            </label>
            <input
              id="pay-amt"
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
                <option value="on_delivery">Al entregar</option>
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
              disabled={pending || !clientId}
            >
              {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
            </button>
          </div>
          {feedback ? <p className="login-hint">{feedback}</p> : null}
        </form>
      ) : null}

      {!showForm ? (
      <>
      <ul className="data-list">
        {payments.slice(0, shown).map((p) => {
          const rec = receiptFromPayment(p);
          return (
            <li key={p.id} className="data-card-wrap">
              <button
                type="button"
                className="data-card"
                onClick={() => openEdit(p)}
              >
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
                  <p className="proveedor-compra-amount">{formatBs(p.amount)}</p>
                </div>
              </button>
              {rec ? (
                <div className="data-card-actions card-wrap-actions">
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
      <LoadMoreButton shown={shown} total={payments.length} onMore={more} />
      </>
      ) : null}
    </div>
  );
}
