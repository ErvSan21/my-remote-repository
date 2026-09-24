"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteSupplierAction } from "@/app/actions/suppliers";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import { PencilIcon } from "@/components/ui/pencil-icon";
import type { Purchase, Supplier } from "@/lib/data-types";
import { purchaseBalance } from "@/lib/debts";
import { formatBs } from "@/lib/format";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";

type SupplierPurchase = Purchase & { numberLabel: string };

type Props = {
  supplier: Supplier;
  debt: number;
  purchases: SupplierPurchase[];
  canEdit: boolean;
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

export function ProveedorDetail({ supplier, debt, purchases, canEdit }: Props) {
  const router = useRouter();
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { shown, more } = useLoadMore(supplier.id);

  function openDelete() {
    setFeedback(null);
    if (deleteRef.current && !deleteRef.current.open) {
      deleteRef.current.showModal();
    }
  }

  function closeDelete() {
    deleteRef.current?.close();
  }

  function onDelete() {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteSupplierAction(supplier.id);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      deleteRef.current?.close();
      router.push("/proveedores");
      router.refresh();
    });
  }

  return (
    <div className="data-stack module-page">
      <header className="module-hero">
        <Link href="/proveedores" className="module-hero-back">
          <BackArrowIcon />
          Proveedores
        </Link>
      </header>

      <section className="proveedor-summary">
        <div>
          <p className="data-card-title">{supplier.name}</p>
          <p className="provider-dept">{supplier.location || "Sin departamento"}</p>
          <p className="data-card-meta">{supplier.phone || "Sin celular"}</p>
          <p className="proveedor-pending">Pendiente: {formatBs(debt)}</p>
          <p className="data-card-meta proveedor-notes">
            {supplier.notes?.trim() ? supplier.notes : "Notas"}
          </p>
        </div>
        {canEdit ? (
          <div className="proveedor-summary-actions">
            <Link
              href={`/proveedores/${supplier.id}/editar`}
              className="proveedor-icon-btn is-edit"
              aria-label="Editar proveedor"
              title="Editar"
            >
              <PencilIcon size={16} />
            </Link>
            <button
              type="button"
              className="proveedor-icon-btn is-delete"
              aria-label="Eliminar proveedor"
              title="Eliminar"
              onClick={openDelete}
              disabled={pending}
            >
              <TrashIcon />
            </button>
          </div>
        ) : null}
      </section>

      <ul className="data-list proveedor-compras">
        {purchases.slice(0, shown).map((purchase) => {
          const balance = purchaseBalance(
            purchase.total_amount,
            purchase.paid_amount ?? 0,
          );
          return (
            <li key={purchase.id}>
              <Link href={`/compras/${purchase.id}`} className="data-card proveedor-compra">
                <div>
                  <p className="data-card-title">Compra {purchase.numberLabel}</p>
                  <p className="data-card-meta">{purchase.quantity_birds} Unidades</p>
                </div>
                <div className="proveedor-compra-side">
                  <span
                    className={
                      balance.is_paid
                        ? "compra-status-tag is-paid"
                        : "compra-status-tag is-pending"
                    }
                  >
                    {balance.is_paid ? "Pagado" : "Pendiente"}
                  </span>
                  <p className="proveedor-compra-amount">
                    {balance.has_price
                      ? formatBs(purchase.total_amount)
                      : "Definir precio"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
        {purchases.length === 0 ? (
          <li className="data-empty">
            <p className="data-empty-title">Sin compras</p>
            <p>Las compras de este proveedor aparecerán aquí.</p>
          </li>
        ) : null}
      </ul>
      <LoadMoreButton shown={shown} total={purchases.length} onMore={more} />

      <dialog
        ref={deleteRef}
        className="pay-dialog"
        aria-labelledby="delete-supplier-title"
        onClick={(event) => {
          if (event.target === deleteRef.current) closeDelete();
        }}
      >
        <div className="pay-dialog-form">
          <h3 id="delete-supplier-title" className="data-form-title">
            Eliminar proveedor
          </h3>
          <p className="data-card-meta">
            Se borrará {supplier.name}. Si tiene compras o pagos, no se puede eliminar.
          </p>
          <div className="module-form-actions">
            <button
              type="button"
              className="btn-muted"
              onClick={closeDelete}
              disabled={pending}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={onDelete}
              disabled={pending}
            >
              {pending ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
          {feedback ? (
            <p className="form-feedback" role="alert">
              {feedback}
            </p>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
