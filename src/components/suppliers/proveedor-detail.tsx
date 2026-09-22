"use client";

import Link from "next/link";
import type { Supplier } from "@/lib/data-types";
import { formatBs } from "@/lib/format";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import { PencilIcon } from "@/components/ui/pencil-icon";

type Props = {
  supplier: Supplier;
  debt: number;
  canEdit: boolean;
};

export function ProveedorDetail({ supplier, debt, canEdit }: Props) {
  return (
    <div className="data-stack">
      <header className="venta-detail-header">
        <div className="venta-detail-title-row">
          <Link
            href="/proveedores"
            className="btn-icon-back"
            aria-label="Volver"
            title="Volver"
          >
            <BackArrowIcon />
          </Link>
          <h2 className="module-title">{supplier.name}</h2>
          {canEdit ? (
            <Link
              href={`/proveedores/${supplier.id}/editar`}
              className="btn-icon-edit"
              aria-label="Editar proveedor"
              title="Editar"
            >
              <PencilIcon />
            </Link>
          ) : null}
        </div>
      </header>

      <section className="data-form">
        <p className="data-card-meta">
          Departamento: {supplier.location || "—"}
        </p>
        <p className="data-card-meta">Celular: {supplier.phone || "—"}</p>
        <p className="data-card-meta">Deuda: {formatBs(debt)}</p>
        {supplier.notes ? (
          <p className="data-card-meta">Notas: {supplier.notes}</p>
        ) : null}
        <p className="data-card-meta">
          Estado: {supplier.active ? "Activo" : "Inactivo"}
        </p>
      </section>
    </div>
  );
}
