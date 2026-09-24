"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { createPurchaseAction } from "@/app/actions/purchases";
import type { Purchase, Supplier } from "@/lib/data-types";
import { formatBs } from "@/lib/format";
import { purchaseBalance } from "@/lib/debts";
import { PageHeader } from "@/components/ui/page-header";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
import { parsePositiveInt } from "@/lib/numbers";

type Props = {
  suppliers: Supplier[];
  purchases: Purchase[];
  listError: string | null;
};

function todayLaPaz() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
}

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function dateKeyLaPaz(iso: string | null | undefined) {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
}

const emptyForm = {
  supplier_id: "",
  purchase_date: todayLaPaz(),
  quantity_birds: "",
  unit_price: "",
  notes: "",
};

export function PurchasesManager({ suppliers, purchases, listError }: Props) {
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active),
    [suppliers],
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ...emptyForm,
    supplier_id: activeSuppliers[0]?.id ?? "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { shown, more } = useLoadMore(`${query}|${dateFrom}|${dateTo}`);

  const supplierPhoneById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of suppliers) {
      map[s.id] = s.phone ?? "";
    }
    return map;
  }, [suppliers]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return purchases.filter((p) => {
      if (q) {
        const phone =
          p.suppliers?.phone ?? supplierPhoneById[p.supplier_id] ?? "";
        const haystack = normalize(`${p.suppliers?.name ?? ""} ${phone}`);
        if (!haystack.includes(q)) return false;
      }
      const regDay = dateKeyLaPaz(p.created_at || p.purchase_date);
      if (dateFrom && regDay < dateFrom) return false;
      if (dateTo && regDay > dateTo) return false;
      return true;
    });
  }, [purchases, query, dateFrom, dateTo, supplierPhoneById]);

  function resetForm() {
    setForm({
      ...emptyForm,
      supplier_id: activeSuppliers[0]?.id ?? "",
      purchase_date: todayLaPaz(),
    });
    setShowForm(false);
  }

  const qtyNum = parsePositiveInt(form.quantity_birds);
  const priceRaw = form.unit_price.trim();
  const priceNum = priceRaw === "" ? null : Number(priceRaw);
  const canSave =
    Boolean(form.supplier_id) &&
    qtyNum != null &&
    (priceNum == null || (Number.isFinite(priceNum) && priceNum >= 0)) &&
    !pending &&
    activeSuppliers.length > 0;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const qty = parsePositiveInt(form.quantity_birds);
    const priceRaw = form.unit_price.trim();
    const unit_price = priceRaw === "" ? null : Number(priceRaw);

    if (qty == null) {
      setFeedback("La cantidad de aves debe ser un entero mayor a 0.");
      return;
    }
    if (unit_price != null && (!Number.isFinite(unit_price) || unit_price < 0)) {
      setFeedback("Precio inválido.");
      return;
    }

    startTransition(async () => {
      const result = await createPurchaseAction({
        supplier_id: form.supplier_id,
        purchase_date: form.purchase_date,
        quantity_birds: qty,
        unit_price,
        notes: form.notes,
      });
      setFeedback(result.message);
      if (result.ok) resetForm();
    });
  }

  return (
    <div className="data-stack module-page">
      <PageHeader
        variant="hero"
        title="Compras"
        addLabel="Nueva compra"
        showAdd={!showForm}
        onBack={showForm ? resetForm : undefined}
        onAdd={() => {
          setForm({
            ...emptyForm,
            supplier_id: activeSuppliers[0]?.id ?? "",
            purchase_date: todayLaPaz(),
          });
          setShowForm(true);
          setFeedback(null);
        }}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form module-form" onSubmit={onSubmit}>
          <h3 className="data-form-title module-form-title">Nueva compra</h3>
          <div className="field">
            <label className="sr-only" htmlFor="pur-supplier">
              Proveedor
            </label>
            <select
              id="pur-supplier"
              required
              value={form.supplier_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, supplier_id: e.target.value }))
              }
              disabled={pending || activeSuppliers.length === 0}
            >
              {activeSuppliers.length === 0 ? (
                <option value="">Crea un proveedor primero</option>
              ) : null}
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pur-date">
              Fecha
            </label>
            <input
              id="pur-date"
              type="date"
              required
              aria-label="Fecha"
              value={form.purchase_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchase_date: e.target.value }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pur-qty">
              Cantidad
            </label>
            <input
              id="pur-qty"
              type="number"
              min={1}
              step={1}
              required
              placeholder="Cantidad"
              value={form.quantity_birds}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity_birds: e.target.value }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pur-price">
              Precio unitario
            </label>
            <input
              id="pur-price"
              type="number"
              min={0}
              step="0.01"
              placeholder="Precio unitario"
              value={form.unit_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit_price: e.target.value }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="pur-notes">
              Notas
            </label>
            <textarea
              id="pur-notes"
              rows={2}
              placeholder="Notas"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="module-form-actions">
            <button
              type="button"
              className="btn-muted"
              onClick={resetForm}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSave}
            >
              {pending ? "Guardando…" : "Crear"}
            </button>
          </div>
          {feedback ? (
            <p className="form-feedback" role="alert">
              {feedback}
            </p>
          ) : null}
        </form>
      ) : null}

      {!showForm ? (
        <>
          <div className="list-filters sheet-filters" id="list-filters">
              <div className="search-bar">
                <label htmlFor="pur-search" className="sr-only">
                  Buscar
                </label>
                <input
                  id="pur-search"
                  type="search"
                  placeholder="Buscar por nombre apellido o celular"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="list-date-filters">
                <div className="field">
                  <label htmlFor="pur-desde">Desde</label>
                  <input
                    id="pur-desde"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="pur-hasta">Hasta</label>
                  <input
                    id="pur-hasta"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              {dateFrom && dateTo && dateFrom > dateTo ? (
                <p className="form-feedback" role="alert">
                  La fecha «Desde» es posterior a «Hasta».
                </p>
              ) : null}
              {dateFrom || dateTo ? (
                <button
                  type="button"
                  className="btn-secondary list-clear-dates"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Limpiar fechas
                </button>
              ) : null}
            </div>

          <ul className="data-list">
            {visible.slice(0, shown).map((p) => {
              const balance = purchaseBalance(
                p.total_amount,
                p.paid_amount ?? 0,
              );
              return (
                <li key={p.id}>
                  <Link href={`/compras/${p.id}`} className="data-card proveedor-compra">
                    <div>
                      <p className="data-card-title">
                        {p.suppliers?.name ?? "Proveedor"}
                      </p>
                      <p className="data-card-meta">{p.quantity_birds} Unidades</p>
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
                          ? formatBs(balance.pending_amount)
                          : "Definir precio"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
            {visible.length === 0 ? (
              <li className="data-empty">
                {purchases.length === 0 ? (
                  <>
                    <p className="data-empty-title">No hay compras</p>
                    <p>Toca + para anotar la primera.</p>
                  </>
                ) : (
                  <>
                    <p className="data-empty-title">Sin resultados</p>
                    <p>Prueba con otro proveedor, celular o rango de fechas.</p>
                  </>
                )}
              </li>
            ) : null}
          </ul>
          <LoadMoreButton shown={shown} total={visible.length} onMore={more} />
        </>
      ) : null}
    </div>
  );
}
