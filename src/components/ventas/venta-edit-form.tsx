"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateConsignmentAction } from "@/app/actions/consignments";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import type { Client, VentaRow } from "@/lib/data-types";
import { formatDateTimeLaPaz, formatVentaTitle } from "@/lib/format";

type Props = {
  venta: VentaRow;
  clients: Client[];
};

export function VentaEditForm({ venta, clients }: Props) {
  const router = useRouter();
  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const [clientId, setClientId] = useState(venta.client_id);
  const [unitPrice, setUnitPrice] = useState(
    venta.unit_price == null ? "" : String(venta.unit_price),
  );
  const [notes, setNotes] = useState(venta.notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const priceNum = Number(unitPrice);
  const canSave =
    Boolean(clientId) &&
    unitPrice.trim() !== "" &&
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    !pending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    startTransition(async () => {
      const result = await updateConsignmentAction({
        id: venta.id,
        client_id: clientId,
        unit_price: priceNum,
        notes,
      });
      setFeedback(result.message);
      if (result.ok) {
        router.push(`/ventas/${venta.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack">
      <header className="venta-detail-header">
        <div className="venta-detail-title-row">
          <Link
            href={`/ventas/${venta.id}`}
            className="btn-icon-back"
            aria-label="Volver"
            title="Volver"
          >
            <BackArrowIcon />
          </Link>
          <h2 className="module-title">{formatVentaTitle(venta.sale_number)}</h2>
        </div>
        <p className="data-card-meta">
          {formatDateTimeLaPaz(venta.created_at)}
        </p>
      </header>

      <form className="data-form" onSubmit={onSubmit}>
        <h3 className="data-form-title">Editar venta</h3>
        <div className="field">
          <label htmlFor="ve-edit-client">Cliente</label>
          <select
            id="ve-edit-client"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={pending}
          >
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="ve-edit-qty">Cantidad</label>
            <input
              id="ve-edit-qty"
              type="number"
              value={venta.quantity_birds}
              disabled
              readOnly
            />
          </div>
          <div className="field">
            <label htmlFor="ve-edit-price">Precio unit. (Bs)</label>
            <input
              id="ve-edit-price"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ve-edit-notes">Notas</label>
          <textarea
            id="ve-edit-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="form-actions form-actions-split">
          <Link
            href={`/ventas/${venta.id}`}
            className="btn-secondary btn-form"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="btn-primary btn-form"
            disabled={!canSave}
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {feedback ? <p className="login-hint">{feedback}</p> : null}
      </form>
    </div>
  );
}
