"use client";

import Link from "next/link";
import type { Purchase } from "@/lib/data-types";
import {
  PURCHASE_STATUS_LABEL,
  formatBs,
  formatDateLaPaz,
  formatDateTimeLaPaz,
} from "@/lib/format";
import { PencilIcon } from "@/components/ui/pencil-icon";
import { ProveedoresAreaTabs } from "@/components/proveedores/proveedores-area-tabs";

type Props = {
  purchase: Purchase;
  canEdit: boolean;
};

export function CompraDetail({ purchase, canEdit }: Props) {
  const title = purchase.suppliers?.name
    ? `Compra · ${purchase.suppliers.name}`
    : "Compra";

  return (
    <div className="data-stack">
      <div className="venta-detail-nav">
        <Link
          href="/proveedores/compras"
          className="btn-secondary btn-form"
        >
          Volver
        </Link>
      </div>

      <ProveedoresAreaTabs />

      <header className="venta-detail-header">
        <div className="venta-detail-title-row">
          <h2 className="module-title">{title}</h2>
          {canEdit ? (
            <Link
              href={`/proveedores/compras/${purchase.id}/editar`}
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
        <p className="data-card-meta">Cantidad: {purchase.quantity_birds}</p>
        <p className="data-card-meta">
          Precio unit.:{" "}
          {purchase.unit_price == null
            ? "pendiente"
            : formatBs(purchase.unit_price)}
        </p>
        <p className="data-card-meta">
          Total: {formatBs(purchase.total_amount)}
        </p>
        <p className="data-card-meta">
          Estado:{" "}
          {PURCHASE_STATUS_LABEL[purchase.status] ?? purchase.status}
        </p>
        {purchase.notes ? (
          <p className="data-card-meta">Notas: {purchase.notes}</p>
        ) : null}
      </section>
    </div>
  );
}
