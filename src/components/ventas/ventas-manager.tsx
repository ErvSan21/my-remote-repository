"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createConsignmentAction,
  updateConsignmentAction,
} from "@/app/actions/consignments";
import { createClientPaymentAction } from "@/app/actions/client-payments";
import type { Client, VentaRow } from "@/lib/data-types";
import { formatBs, formatDateLaPaz } from "@/lib/format";
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
      v.pending_amount > 0 ? String(Math.round(v.pending_amount * 100) / 100) : "",
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

  function onCobro(e: FormEvent) {
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
              {feedback && !editingVenta?.pending_amount ? (
                <p className="login-hint">{feedback}</p>
              ) : null}
            </form>
          ) : null}

          {editing && editingVenta && editingVenta.pending_amount > 0.001 ? (
            <form className="data-form" onSubmit={onCobro}>
              <h3 className="data-form-title">Registrar cobro</h3>
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
                  {pending ? "Registrando…" : "Cobrar"}
                </button>
                {!canCreate ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={resetForm}
                    disabled={pending}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
              {feedback ? <p className="login-hint">{feedback}</p> : null}
            </form>
          ) : null}

          {editing && !canCreate && editingVenta?.is_paid ? (
            <div className="data-form">
              <p className="login-hint">Esta venta está pagada.</p>
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

      {!showForm && feedback ? <p className="login-hint">{feedback}</p> : null}

      <ul className="data-list">
        {ventas.map((v) => {
          const name = v.clients?.name ?? "Cliente";
          const direccion = v.clients?.zone || "Sin dirección";
          const phone = v.clients?.phone || "Sin celular";
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
                    <p className="data-card-meta">{direccion}</p>
                    <p className="data-card-meta">{phone}</p>
                  </div>
                  {v.is_paid ? (
                    <span className="venta-pagado">Pagado</span>
                  ) : (
                    <p className="data-card-amount venta-pendiente">
                      {formatBs(
                        v.total_amount == null ? null : v.pending_amount,
                      )}
                    </p>
                  )}
                </div>
                <p className="venta-monto">
                  Monto: {formatBs(v.total_amount)}
                  <span className="venta-monto-meta">
                    {" · "}
                    {formatDateLaPaz(v.left_at)} · {v.quantity_birds} aves
                  </span>
                </p>
              </button>
            </li>
          );
        })}
        {ventas.length === 0 ? (
          <li className="data-empty">No hay ventas todavía.</li>
        ) : null}
      </ul>
    </div>
  );
}
