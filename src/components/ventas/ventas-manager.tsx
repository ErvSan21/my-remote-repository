"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createConsignmentAction,
  updateConsignmentAction,
} from "@/app/actions/consignments";
import { createClientPaymentAction } from "@/app/actions/client-payments";
import type { Client, ProfileRef, VentaRow } from "@/lib/data-types";
import {
  PAYMENT_METHOD_LABEL,
  formatAmountPlain,
  formatBs,
  formatDateLaPaz,
  formatDateTimeLaPaz,
} from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { VentasAreaTabs } from "@/components/ventas/ventas-area-tabs";

type Props = {
  ventas: VentaRow[];
  clients: Client[];
  listError: string | null;
  canCreate: boolean;
  showClientesTab: boolean;
};

const emptyForm = {
  id: "" as string,
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

function personEmail(p?: ProfileRef | null) {
  return p?.email || p?.username || p?.full_name || "—";
}

export function VentasManager({
  ventas,
  clients,
  listError,
  canCreate,
  showClientesTab,
}: Props) {
  const router = useRouter();
  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cobroAmount, setCobroAmount] = useState("");
  const [cobroMethod, setCobroMethod] = useState<PaymentMethod>("cash");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const editing = Boolean(form.id);

  const editingVenta = useMemo(
    () => (form.id ? ventas.find((v) => v.id === form.id) : null),
    [form.id, ventas],
  );

  const unitPriceNum = Number(form.unit_price);
  const qtyNum = Number(form.quantity_birds);
  const hasValidPrice =
    form.unit_price.trim() !== "" &&
    Number.isFinite(unitPriceNum) &&
    unitPriceNum > 0;
  const hasValidQty =
    editing ||
    (form.quantity_birds.trim() !== "" &&
      Number.isFinite(qtyNum) &&
      qtyNum >= 1);
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
        const haystack = normalize(
          `${v.clients?.name ?? ""} ${v.clients?.phone ?? ""}`,
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
    setCobroAmount("");
    setCobroMethod("cash");
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

  function openEdit(v: VentaRow) {
    setForm({
      id: v.id,
      client_id: v.client_id,
      quantity_birds: String(v.quantity_birds),
      unit_price: v.unit_price == null ? "" : String(v.unit_price),
      notes: v.notes ?? "",
      pay_in_full: false,
      pay_method: "cash",
    });
    setCobroAmount(
      v.pending_amount > 0
        ? String(Math.round(v.pending_amount * 100) / 100)
        : "",
    );
    setShowForm(true);
    setFeedback(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const priceRaw = form.unit_price.trim();
    const unit_price = Number(priceRaw);

    if (!Number.isFinite(unit_price) || unit_price <= 0) {
      setFeedback("El precio unitario es obligatorio.");
      return;
    }

    startTransition(async () => {
      if (form.id) {
        if (!canCreate) {
          setFeedback("No tienes permiso para editar la venta.");
          return;
        }
        const result = await updateConsignmentAction({
          id: form.id,
          client_id: form.client_id,
          unit_price,
          notes: form.notes,
        });
        setFeedback(result.message);
        if (result.ok) {
          resetForm();
          router.refresh();
        }
        return;
      }

      const result = await createConsignmentAction({
        client_id: form.client_id,
        quantity_birds: Number(form.quantity_birds),
        unit_price,
        notes: form.notes,
        pay_in_full: form.pay_in_full,
        pay_method: form.pay_method,
      });
      setFeedback(result.message);
      if (result.ok) {
        resetForm();
        router.refresh();
      }
    });
  }

  function onPagar(e: FormEvent) {
    e.preventDefault();
    if (!editingVenta) return;
    startTransition(async () => {
      const result = await createClientPaymentAction({
        client_id: editingVenta.client_id,
        consignment_id: editingVenta.id,
        amount: Number(cobroAmount),
        method: cobroMethod,
        notes: "",
      });
      setFeedback(result.message);
      if (result.ok && result.receiptId) {
        resetForm();
        router.push(`/recibos/${result.receiptId}`);
        router.refresh();
      } else if (result.ok) {
        resetForm();
        router.refresh();
      }
    });
  }

  return (
    <div className="data-stack">
      <PageHeader
        title="Ventas"
        addLabel="Nueva venta"
        showAdd={canCreate && !showForm}
        onAdd={openCreate}
      />

      <VentasAreaTabs showClientesTab={showClientesTab} />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <div className="data-form-stack">
          {editing && editingVenta ? (
            <div className="data-form venta-detail-meta">
              <p className="data-card-title">
                {editingVenta.clients?.name ?? "Cliente"}
              </p>
              <p className="data-card-meta">
                Registrado: {formatDateTimeLaPaz(editingVenta.created_at)}
              </p>
              <p className="data-card-meta">
                Por: {personEmail(editingVenta.creator)}
              </p>
              <p className="data-card-meta">
                {editingVenta.clients?.phone || "Sin celular"}
                {editingVenta.clients?.zone
                  ? ` · ${editingVenta.clients.zone}`
                  : ""}
              </p>
            </div>
          ) : null}

          {canCreate ? (
            <form className="data-form" onSubmit={onSubmit}>
              <h3 className="data-form-title">
                {editing ? "Editar venta" : "Nueva venta"}
              </h3>
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
                  <label htmlFor="ve-qty">Cantidad (aves)</label>
                  <input
                    id="ve-qty"
                    type="number"
                    min={1}
                    required={!editing}
                    value={form.quantity_birds}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quantity_birds: e.target.value,
                      }))
                    }
                    disabled={pending || editing}
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
              {!editing ? (
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
              ) : null}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!canSubmitSale}
                >
                  {pending
                    ? "Guardando…"
                    : editing
                      ? "Guardar cambios"
                      : "Registrar venta"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                  disabled={pending}
                >
                  Cancelar
                </button>
              </div>
              {feedback && !(editingVenta && editingVenta.pending_amount > 0) ? (
                <p className="login-hint">{feedback}</p>
              ) : null}
            </form>
          ) : null}

          {editing && editingVenta ? (
            <div className="data-form">
              <h3 className="data-form-title">Pagos</h3>
              <ul className="venta-pay-list">
                {editingVenta.payments.map((p) => (
                  <li key={p.id} className="venta-pay-item">
                    <div>
                      <p className="data-card-title">{formatBs(p.amount)}</p>
                      <p className="data-card-meta">
                        {formatDateTimeLaPaz(p.paid_at)} ·{" "}
                        {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                      </p>
                      <p className="data-card-meta">
                        Por: {personEmail(p.recorder)}
                      </p>
                    </div>
                  </li>
                ))}
                {editingVenta.payments.length === 0 ? (
                  <li className="data-empty">Sin pagos registrados.</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {editing && editingVenta && editingVenta.pending_amount > 0.001 ? (
            <form className="data-form" onSubmit={onPagar}>
              <h3 className="data-form-title">Pagar</h3>
              <p className="data-card-meta">
                Pendiente: {formatBs(editingVenta.pending_amount)}
              </p>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ve-cobro-amt">Monto (Bs)</label>
                  <input
                    id="ve-cobro-amt"
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    value={cobroAmount}
                    onChange={(e) => setCobroAmount(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ve-cobro-method">Método</label>
                  <select
                    id="ve-cobro-method"
                    value={cobroMethod}
                    onChange={(e) =>
                      setCobroMethod(e.target.value as PaymentMethod)
                    }
                    disabled={pending}
                  >
                    <option value="cash">Efectivo</option>
                    <option value="qr">QR</option>
                    <option value="on_delivery">Al entregar</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending ? "Registrando…" : "Pagar"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                  disabled={pending}
                >
                  Cancelar
                </button>
              </div>
              {feedback ? <p className="login-hint">{feedback}</p> : null}
            </form>
          ) : null}

          {editing && !canCreate && editingVenta?.is_paid ? (
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                Cerrar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!showForm ? (
        <>
          <div className="list-filters">
            <div className="search-bar">
              <label htmlFor="ve-search" className="sr-only">
                Buscar
              </label>
              <input
                id="ve-search"
                type="search"
                placeholder="Buscar por nombre o celular…"
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
            {visible.map((v) => {
              const name = v.clients?.name ?? "Cliente";
              const phone = v.clients?.phone || "Sin celular";
              const amountShown = v.is_paid
                ? v.total_amount
                : v.total_amount == null
                  ? null
                  : v.pending_amount;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    className="data-card venta-card"
                    onClick={() => openEdit(v)}
                  >
                    <div className="data-card-top">
                      <div>
                        <p className="data-card-title">{name}</p>
                        <p className="data-card-meta">
                          {formatDateLaPaz(v.created_at)}
                        </p>
                        <p className="data-card-meta">{phone}</p>
                      </div>
                      <div className="venta-card-right">
                        {v.is_paid ? (
                          <span className="venta-pagado">Pagado</span>
                        ) : (
                          <span className="venta-credito">Pendiente</span>
                        )}
                        <p
                          className={`venta-amount-plain${v.is_paid ? " is-paid" : ""}`}
                        >
                          {formatAmountPlain(amountShown)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 ? (
              <li className="data-empty">
                {ventas.length === 0
                  ? "No hay ventas todavía."
                  : "Ninguna venta coincide con la búsqueda."}
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </div>
  );
}
