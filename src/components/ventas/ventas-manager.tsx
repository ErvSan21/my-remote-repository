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
import { parsePositiveInt } from "@/lib/numbers";

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

function dateKeyLaPaz(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
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
  const [showSearch, setShowSearch] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return ventas.filter((v) => {
      if (q) {
        const code = formatVentaTitle(v.sale_number);
        const haystack = normalize(
          `${v.clients?.name ?? ""} ${v.clients?.phone ?? ""} ${code} ${v.sale_number ?? ""}`,
        );
        if (!haystack.includes(q)) return false;
      }
      const saleDay = dateKeyLaPaz(v.created_at);
      if (dateFrom && saleDay < dateFrom) return false;
      if (dateTo && saleDay > dateTo) return false;
      return true;
    });
  }, [ventas, query, dateFrom, dateTo]);

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
        addLabel="Registrar Venta"
        addStyle="button"
        showAdd={canCreate && !showForm}
        onAdd={openCreate}
        searchOpen={showSearch}
        onSearchToggle={
          showForm
            ? undefined
            : () =>
                setShowSearch((open) => {
                  const next = !open;
                  if (next) {
                    requestAnimationFrame(() => {
                      document.getElementById("ve-search")?.focus();
                    });
                  }
                  return next;
                })
        }
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form" onSubmit={onSubmit}>
          <h3 className="data-form-title">Nueva venta</h3>
          <div className="field">
            <label htmlFor="ve-client">Cliente</label>
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
          <div className="field-row">
            <div className="field">
              <label htmlFor="ve-qty">Cantidad</label>
              <input
                id="ve-qty"
                type="number"
                min={1}
                step={1}
                required
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
              <label htmlFor="ve-price">Precio unit. (Bs)</label>
              <input
                id="ve-price"
                type="number"
                min={0.01}
                step="0.01"
                required
                value={form.unit_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit_price: e.target.value }))
                }
                disabled={pending}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ve-notes">Notas</label>
            <textarea
              id="ve-notes"
              rows={2}
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
          <div className="form-actions form-actions-split">
            <button
              type="button"
              className="btn-secondary btn-form"
              onClick={resetForm}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary btn-form"
              disabled={!canSubmitSale}
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
      ) : null}

      {!showForm && feedback ? <p className="login-hint">{feedback}</p> : null}

      {!showForm ? (
        <>
          {(showSearch || query || dateFrom || dateTo) && (
            <div className="list-filters sheet-filters" id="list-filters">
              <div className="search-bar">
                <label htmlFor="ve-search" className="sr-only">
                  Buscar
                </label>
                <input
                  id="ve-search"
                  type="search"
                  placeholder="Buscar por cliente o código…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="list-date-filters">
                <div className="field">
                  <label htmlFor="ve-desde">Desde</label>
                  <input
                    id="ve-desde"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ve-hasta">Hasta</label>
                  <input
                    id="ve-hasta"
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
          )}

          <ul className="data-list">
            {visible.map((v) => {
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
                  <Link
                    href={`/ventas/${v.id}`}
                    className="data-card venta-card"
                  >
                    <div className="venta-card-row">
                      <span className="venta-avatar" aria-hidden>
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        >
                          <path d="M20 21a8 8 0 0 0-16 0" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <div className="venta-card-body">
                        <p className="data-card-title venta-card-client">
                          {name}
                        </p>
                        <p className="data-card-meta">
                          {formatWhenLaPaz(v.created_at)}
                          {" · "}
                          {formatVentaTitle(v.sale_number)}
                        </p>
                      </div>
                      <div className="venta-card-right">
                        <p className="venta-amount-plain">
                          {formatBs(v.total_amount)}
                        </p>
                        <span
                          className={`venta-status-pill status-${statusKey}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
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
                    <p>Usa «Registrar Venta» para anotar la primera.</p>
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
        </>
      ) : null}
    </div>
  );
}
