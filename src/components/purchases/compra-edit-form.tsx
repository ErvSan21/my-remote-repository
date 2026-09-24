"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePurchaseAction } from "@/app/actions/purchases";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import type { Purchase, Supplier } from "@/lib/data-types";
import { parsePositiveInt } from "@/lib/numbers";

type Props = {
  purchase: Purchase;
  suppliers: Supplier[];
};

export function CompraEditForm({ purchase, suppliers }: Props) {
  const router = useRouter();
  const activeSuppliers = useMemo(() => {
    const list = suppliers.filter((s) => s.active);
    if (list.some((s) => s.id === purchase.supplier_id)) return list;
    const current: Supplier = {
      id: purchase.supplier_id,
      name: purchase.suppliers?.name
        ? `${purchase.suppliers.name} (inactivo)`
        : "Proveedor actual",
      location: null,
      phone: purchase.suppliers?.phone ?? null,
      notes: null,
      active: false,
      created_at: purchase.created_at,
      updated_at: purchase.created_at,
    };
    return [current, ...list];
  }, [suppliers, purchase]);
  const [supplierId, setSupplierId] = useState(purchase.supplier_id);
  const [purchaseDate, setPurchaseDate] = useState(purchase.purchase_date);
  const [quantity, setQuantity] = useState(String(purchase.quantity_birds));
  const [unitPrice, setUnitPrice] = useState(
    purchase.unit_price == null ? "" : String(purchase.unit_price),
  );
  const [notes, setNotes] = useState(purchase.notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const qtyNum = parsePositiveInt(quantity);
  const priceRaw = unitPrice.trim();
  const priceNum = priceRaw === "" ? null : Number(priceRaw);
  const canSave =
    Boolean(supplierId) &&
    qtyNum != null &&
    (priceNum == null || (Number.isFinite(priceNum) && priceNum >= 0)) &&
    !pending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave || qtyNum == null) return;
    startTransition(async () => {
      const result = await updatePurchaseAction({
        id: purchase.id,
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        quantity_birds: qtyNum,
        unit_price: priceNum,
        notes,
      });
      setFeedback(result.message);
      if (result.ok) {
        router.push(`/compras/${purchase.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack module-page">
      <header className="module-hero">
        <Link href={`/compras/${purchase.id}`} className="module-hero-back">
          <BackArrowIcon />
          Compras
        </Link>
      </header>

      <form className="data-form module-form" onSubmit={onSubmit}>
        <h3 className="data-form-title module-form-title">Editar compra</h3>
        <div className="field">
          <label className="sr-only" htmlFor="pur-edit-supplier">
            Proveedor
          </label>
          <select
            id="pur-edit-supplier"
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={pending}
          >
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="pur-edit-date">
            Fecha
          </label>
          <input
            id="pur-edit-date"
            type="date"
            required
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="pur-edit-qty">
            Cantidad
          </label>
          <input
            id="pur-edit-qty"
            type="number"
            min={1}
            step={1}
            required
            placeholder="Cantidad"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="pur-edit-price">
            Precio unitario
          </label>
          <input
            id="pur-edit-price"
            type="number"
            min={0}
            step="0.01"
            placeholder="Precio unitario"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="pur-edit-notes">
            Notas
          </label>
          <textarea
            id="pur-edit-notes"
            rows={2}
            placeholder="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="module-form-actions">
          <Link
            href={`/compras/${purchase.id}`}
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
