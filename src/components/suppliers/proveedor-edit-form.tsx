"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateSupplierAction } from "@/app/actions/suppliers";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";
import type { Supplier } from "@/lib/data-types";
import { BOLIVIA_DEPARTMENTS } from "@/lib/format";
import { phoneDigits } from "@/lib/validation";

type Props = {
  supplier: Supplier;
};

export function ProveedorEditForm({ supplier }: Props) {
  const router = useRouter();
  const [name, setName] = useState(supplier.name);
  const [location, setLocation] = useState(supplier.location ?? "");
  const [phone, setPhone] = useState(phoneDigits(supplier.phone ?? ""));
  const [notes, setNotes] = useState(supplier.notes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSave = name.trim().length > 0 && location.trim().length > 0 && !pending;

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
    <div className="data-stack module-page">
      <header className="module-hero">
        <Link href={`/proveedores/${supplier.id}`} className="module-hero-back">
          <BackArrowIcon />
          Proveedores
        </Link>
      </header>

      <form className="data-form module-form" onSubmit={onSubmit}>
        <h3 className="data-form-title module-form-title">Editar proveedor</h3>
        <div className="field">
          <label className="sr-only" htmlFor="sup-edit-name">
            Nombre y apellido
          </label>
          <input
            id="sup-edit-name"
            required
            placeholder="Nombre y apellido"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="sup-edit-loc">
            Departamento
          </label>
          <select
            id="sup-edit-loc"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={pending}
          >
            <option value="" disabled>
              Departamento
            </option>
            {[
              ...BOLIVIA_DEPARTMENTS,
              ...(location &&
              !(BOLIVIA_DEPARTMENTS as readonly string[]).includes(location)
                ? [location]
                : []),
            ].map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="sup-edit-phone">
            Celular
          </label>
          <input
            id="sup-edit-phone"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            placeholder="Celular"
            value={phone}
            onChange={(e) => setPhone(phoneDigits(e.target.value))}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="sup-edit-notes">
            Notas
          </label>
          <textarea
            id="sup-edit-notes"
            rows={2}
            placeholder="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="module-form-actions">
          <Link
            href={`/proveedores/${supplier.id}`}
            className={`btn-muted${pending ? " is-disabled" : ""}`}
            aria-disabled={pending || undefined}
            tabIndex={pending ? -1 : undefined}
            onClick={(e) => {
              if (pending) e.preventDefault();
            }}
          >
            Cancelar
          </Link>
          <button type="submit" className="btn-primary" disabled={!canSave}>
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
