"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateSupplierAction } from "@/app/actions/suppliers";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import type { Supplier } from "@/lib/data-types";
import { BOLIVIA_DEPARTMENTS } from "@/lib/format";

type Props = {
  supplier: Supplier;
};

export function ProveedorEditForm({ supplier }: Props) {
  const router = useRouter();
  const [name, setName] = useState(supplier.name);
  const [location, setLocation] = useState(supplier.location || "Santa Cruz");
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [notes, setNotes] = useState(supplier.notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSave = name.trim().length > 0 && !pending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSupplierAction({
        id: supplier.id,
        name,
        location,
        phone,
        notes,
        active: supplier.active,
      });
      setFeedback(result.message);
      if (result.ok) {
        router.push(`/proveedores/${supplier.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack">
      <header className="venta-detail-header">
        <div className="venta-detail-title-row">
          <Link
            href={`/proveedores/${supplier.id}`}
            className="btn-icon-back"
            aria-label="Volver"
            title="Volver"
          >
            <BackArrowIcon />
          </Link>
          <h2 className="module-title">{supplier.name}</h2>
        </div>
      </header>

      <form className="data-form" onSubmit={onSubmit}>
        <h3 className="data-form-title">Editar proveedor</h3>
        <div className="field">
          <label htmlFor="sup-edit-name">Nombre y apellido</label>
          <input
            id="sup-edit-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="sup-edit-loc">Departamento</label>
            <select
              id="sup-edit-loc"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={pending}
            >
              {BOLIVIA_DEPARTMENTS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sup-edit-phone">Celular</label>
            <input
              id="sup-edit-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sup-edit-notes">Notas</label>
          <textarea
            id="sup-edit-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="form-actions form-actions-split">
          <Link
            href={`/proveedores/${supplier.id}`}
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
