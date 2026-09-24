"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateConsignmentAction } from "@/app/actions/consignments";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import type { Client, VentaRow } from "@/lib/data-types";

type Props = {
  venta: VentaRow;
  clients: Client[];
};

export function VentaEditForm({ venta, clients }: Props) {
  const router = useRouter();
  const activeClients = useMemo(() => {
    const list = clients.filter((c) => c.active);
    if (list.some((c) => c.id === venta.client_id)) return list;
    const current: Client = {
      id: venta.client_id,
      name: venta.clients?.name
        ? `${venta.clients.name} (inactivo)`
        : "Cliente actual",
      zone: venta.clients?.zone ?? null,
      phone: venta.clients?.phone ?? null,
      notes: null,
      active: false,
      created_at: venta.created_at,
      updated_at: venta.created_at,
    };
    return [current, ...list];
  }, [clients, venta]);
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
    <div className="data-stack module-page">
      <header className="module-hero">
        <Link href={`/ventas/${venta.id}`} className="module-hero-back">
          <BackArrowIcon />
          Ventas
        </Link>
      </header>

      <form className="data-form module-form" onSubmit={onSubmit}>
        <h3 className="data-form-title module-form-title">Editar venta</h3>
        <div className="field">
          <label className="sr-only" htmlFor="ve-edit-client">
            Cliente
          </label>
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
        <div className="field">
          <label className="sr-only" htmlFor="ve-edit-qty">
            Cantidad
          </label>
          <input
            id="ve-edit-qty"
            type="number"
            value={venta.quantity_birds}
            disabled
            readOnly
            aria-label="Cantidad"
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="ve-edit-price">
            Precio unitario
          </label>
          <input
            id="ve-edit-price"
            type="number"
            min={0.01}
            step="0.01"
            required
            placeholder="Precio unitario"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="ve-edit-notes">
            Notas
          </label>
          <textarea
            id="ve-edit-notes"
            rows={2}
            placeholder="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="module-form-actions">
          <Link
            href={`/ventas/${venta.id}`}
            className={`btn-muted${pending ? " is-disabled" : ""}`}
            aria-disabled={pending || undefined}
            tabIndex={pending ? -1 : undefined}
            onClick={(e) => {
              if (pending) e.preventDefault();
            }}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={!canSave}
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {feedback ? (
          <p className="form-feedback" role="alert">
            {feedback}
          </p>
        ) : null}
      </form>
    </div>
  );
}
