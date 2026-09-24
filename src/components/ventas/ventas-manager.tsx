"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createConsignmentAction } from "@/app/actions/consignments";
import type { Client, VentaRow } from "@/lib/data-types";
import {
  formatBs,
  formatVentaTitle,
  formatWhenLaPaz,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
import { parsePositiveInt } from "@/lib/numbers";
import { DateRangeFields } from "@/components/date-range-fields";
import { dayKeyLaPaz, weekBoundsLaPaz } from "@/lib/dates";

type Props = {
  ventas: VentaRow[];
  clients: Client[];
  listError: string | null;
  canCreate: boolean;
};

const emptyForm = {
  client_id: "",
  quantity_birds: "",
  unit_price: "",
  notes: "",
  pay_in_full: false,
  pay_method: "cash" as PaymentMethod,
};

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function VentasManager({
  ventas,
  clients,
  listError,
  canCreate,
}: Props) {
  const router = useRouter();
  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const week = weekBoundsLaPaz();
  const [dateFrom, setDateFrom] = useState(week.from);
  const [dateTo, setDateTo] = useState(week.to);
  const { shown, more } = useLoadMore(`${query}|${dateFrom}|${dateTo}`);

  const unitPriceNum = Number(form.unit_price);
  const hasValidPrice =
    form.unit_price.trim() !== "" &&
    Number.isFinite(unitPriceNum) &&
    unitPriceNum > 0;
  const hasValidQty = parsePositiveInt(form.quantity_birds) != null;
  const canSubmitSale =
    Boolean(form.client_id) &&
    activeClients.length > 0 &&
    hasValidPrice &&
    hasValidQty &&
    !pending;

  const rangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const visible = useMemo(() => {
    if (rangeInvalid) return [];
    const q = normalize(query.trim());
    return ventas.filter((v) => {
      if (q) {
        const code = formatVentaTitle(v.sale_number);
        const haystack = normalize(
          `${v.clients?.name ?? ""} ${v.clients?.phone ?? ""} ${code} ${v.sale_number ?? ""}`,
        );
        if (!haystack.includes(q)) return false;
      }
      const saleDay = dayKeyLaPaz(v.created_at);
      if (dateFrom && saleDay < dateFrom) return false;
      if (dateTo && saleDay > dateTo) return false;
      return true;
    });
  }, [ventas, query, dateFrom, dateTo, rangeInvalid]);

  function resetForm() {
    setForm({
      ...emptyForm,
      client_id: activeClients[0]?.id ?? "",
    });
    setShowForm(false);
  }

  function openCreate() {
    setForm({
      ...emptyForm,
      client_id: activeClients[0]?.id ?? "",
    });
    setShowForm(true);
    setFeedback(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const unit_price = Number(form.unit_price.trim());
    const quantity_birds = parsePositiveInt(form.quantity_birds);
    if (!Number.isFinite(unit_price) || unit_price <= 0) {
      setFeedback("El precio unitario es obligatorio.");
      return;
    }
    if (quantity_birds == null) {
      setFeedback("La cantidad debe ser un entero mayor a 0.");
      return;
    }

    startTransition(async () => {
      const result = await createConsignmentAction({
        client_id: form.client_id,
        quantity_birds,
        unit_price,
        notes: form.notes,
        pay_in_full: form.pay_in_full,
        pay_method: form.pay_method,
      });
      setFeedback(result.message);
      if (result.ok || result.consignmentId) {
        resetForm();
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack module-page">
      <PageHeader
        variant="hero"
        title="Ventas"
        addLabel="Nueva venta"
        showAdd={canCreate && !showForm}
        onBack={showForm ? resetForm : undefined}
        onAdd={openCreate}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form module-form" onSubmit={onSubmit}>
          <h3 className="data-form-title module-form-title">Nueva venta</h3>
          <div className="field">
            <label className="sr-only" htmlFor="ve-client">
              Cliente
            </label>
            <select
              id="ve-client"
              required
              value={form.client_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, client_id: e.target.value }))
              }
              disabled={pending || activeClients.length === 0}
            >
              {activeClients.length === 0 ? (
                <option value="">Crea un cliente primero</option>
              ) : null}
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="ve-qty">
              Cantidad
            </label>
            <input
              id="ve-qty"
              type="number"
              min={1}
              step={1}
              required
              placeholder="Cantidad"
              value={form.quantity_birds}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  quantity_birds: e.target.value,
                }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="ve-price">
              Precio unitario
            </label>
            <input
              id="ve-price"
              type="number"
              min={0.01}
              step="0.01"
              required
              placeholder="Precio unitario"
              value={form.unit_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit_price: e.target.value }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="ve-notes">
              Notas
            </label>
            <textarea
              id="ve-notes"
              rows={2}
              placeholder="Notas"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              disabled={pending}
            />
          </div>
          <div className="form-check-row">
            <label className="check-inline">
              <input
                type="checkbox"
                checked={form.pay_in_full}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pay_in_full: e.target.checked,
                  }))
                }
                disabled={pending}
              />
              <span>Al contado (pagado ahora)</span>
            </label>
            {form.pay_in_full ? (
              <select
                className="form-check-select"
                aria-label="Método de pago"
                value={form.pay_method}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pay_method: e.target.value as PaymentMethod,
                  }))
                }
                disabled={pending}
              >
                <option value="cash">Efectivo</option>
                <option value="qr">QR</option>
                <option value="on_delivery">Al entregar</option>
              </select>
            ) : null}
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
              disabled={!canSubmitSale}
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

      {!showForm && feedback ? <p className="login-hint">{feedback}</p> : null}

      {!showForm ? (
        <>
          <div className="list-filters sheet-filters" id="list-filters">
              <div className="search-bar">
                <label htmlFor="ve-search" className="sr-only">
                  Buscar
                </label>
                <input
                  id="ve-search"
                  type="search"
                  placeholder="Buscar por nombre apellido o celular"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <DateRangeFields
                from={dateFrom}
                to={dateTo}
                fromId="ve-desde"
                toId="ve-hasta"
                onFrom={setDateFrom}
                onTo={setDateTo}
              />
              {rangeInvalid ? (
                <p className="form-feedback" role="alert">
                  La fecha de inicio es posterior a la de fin.
                </p>
              ) : null}
            </div>

          <ul className="data-list">
            {visible.slice(0, shown).map((v) => {
              const name = v.clients?.name ?? "Cliente";
              const statusKey = v.is_paid
                ? "paid"
                : v.paid_amount > 0.001
                  ? "partial"
                  : "pending";
              const statusLabel =
                statusKey === "paid"
                  ? "Pagado"
                  : statusKey === "partial"
                    ? "Parcial"
                    : "Pendiente";
              return (
                <li key={v.id}>
                  <Link href={`/ventas/${v.id}`} className="data-card proveedor-compra">
                    <div>
                      <p className="data-card-title">{name}</p>
                      <p className="data-card-meta">
                        {v.quantity_birds} Unidades
                      </p>
                      <p className="data-card-meta">
                        {formatWhenLaPaz(v.created_at)}
                        {" · "}
                        {formatVentaTitle(v.sale_number)}
                      </p>
                    </div>
                    <div className="proveedor-compra-side">
                      <span
                        className={
                          statusKey === "paid"
                            ? "compra-status-tag is-paid"
                            : statusKey === "partial"
                              ? "compra-status-tag is-partial"
                              : "compra-status-tag is-pending"
                        }
                      >
                        {statusLabel}
                      </span>
                      <p className="proveedor-compra-amount">
                        {formatBs(v.total_amount)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
            {visible.length === 0 ? (
              <li className="data-empty">
                {ventas.length === 0 ? (
                  <>
                    <p className="data-empty-title">No hay ventas</p>
                    <p>Toca + para anotar la primera.</p>
                  </>
                ) : (
                  <>
                    <p className="data-empty-title">Sin resultados</p>
                    <p>Prueba con otro cliente, código o rango de fechas.</p>
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
