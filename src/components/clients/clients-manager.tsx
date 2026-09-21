"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { upsertClientAction } from "@/app/actions/clients";
import {
  createConsignmentAction,
  updateConsignmentAction,
} from "@/app/actions/consignments";
import type { Client, Consignment } from "@/lib/data-types";
import {
  CLIENT_ZONES,
  CONSIGNMENT_STATUS_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

type Props = {
  clients: Client[];
  consignments: Consignment[];
  availableStock: number;
  listError: string | null;
};

const emptyClient = {
  id: "" as string,
  name: "",
  zone: "La Paz",
  phone: "",
  notes: "",
};

const emptyCons = {
  id: "" as string,
  client_id: "",
  quantity_birds: "",
  unit_price: "",
  notes: "",
};

export function ClientsManager({
  clients,
  consignments,
  listError,
}: Props) {
  const [tab, setTab] = useState<"clientes" | "consignacion">("clientes");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const [consForm, setConsForm] = useState(emptyCons);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const editingClient = Boolean(form.id);
  const editingCons = Boolean(consForm.id);

  function resetClientForm() {
    setForm(emptyClient);
    setShowForm(false);
  }

  function resetConsForm() {
    setConsForm({
      ...emptyCons,
      client_id: activeClients[0]?.id ?? "",
    });
    setShowForm(false);
  }

  function onClientSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertClientAction({
        id: form.id || undefined,
        name: form.name,
        zone: form.zone,
        phone: form.phone,
        notes: form.notes,
      });
      setFeedback(result.message);
      if (result.ok) resetClientForm();
    });
  }

  function onConsSubmit(e: FormEvent) {
    e.preventDefault();
    const priceRaw = consForm.unit_price.trim();
    const unit_price = priceRaw === "" ? null : Number(priceRaw);
    startTransition(async () => {
      const result = consForm.id
        ? await updateConsignmentAction({
            id: consForm.id,
            client_id: consForm.client_id || activeClients[0]?.id || "",
            unit_price,
            notes: consForm.notes,
          })
        : await createConsignmentAction({
            client_id: consForm.client_id || activeClients[0]?.id || "",
            quantity_birds: Number(consForm.quantity_birds),
            unit_price,
            notes: consForm.notes,
          });
      setFeedback(result.message);
      if (result.ok) resetConsForm();
    });
  }

  return (
    <div className="data-stack">
      <PageHeader
        title="Clientes"
        addLabel={tab === "clientes" ? "Crear cliente" : "Nueva consignación"}
        showAdd={!showForm}
        onAdd={() => {
          if (tab === "clientes") {
            setForm(emptyClient);
          } else {
            setConsForm({
              ...emptyCons,
              client_id: activeClients[0]?.id ?? "",
            });
          }
          setShowForm(true);
          setFeedback(null);
        }}
      />

      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn ${tab === "clientes" ? "is-active" : ""}`}
          onClick={() => {
            setTab("clientes");
            setShowForm(false);
            setFeedback(null);
          }}
        >
          Clientes
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "consignacion" ? "is-active" : ""}`}
          onClick={() => {
            setTab("consignacion");
            setShowForm(false);
            setFeedback(null);
          }}
        >
          Consignación
        </button>
      </div>

      {listError ? <p className="module-note">{listError}</p> : null}

      {tab === "clientes" ? (
        <>
          {showForm ? (
            <form className="data-form" onSubmit={onClientSubmit}>
              <h3 className="data-form-title">
                {editingClient ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <div className="field">
                <label htmlFor="cl-name">Nombre</label>
                <input
                  id="cl-name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  disabled={pending}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="cl-zone">Zona</label>
                  <select
                    id="cl-zone"
                    value={form.zone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, zone: e.target.value }))
                    }
                    disabled={pending}
                  >
                    {CLIENT_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cl-phone">Celular</label>
                  <input
                    id="cl-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    disabled={pending}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="cl-notes">Notas</label>
                <textarea
                  id="cl-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  disabled={pending}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={pending}>
                  {editingClient ? "Guardar cambios" : "Crear cliente"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetClientForm}
                >
                  Cancelar
                </button>
              </div>
              {feedback ? <p className="login-hint">{feedback}</p> : null}
            </form>
          ) : null}

          {!showForm && feedback ? (
            <p className="login-hint">{feedback}</p>
          ) : null}

          <ul className="data-list">
            {activeClients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="data-card"
                  onClick={() => {
                    setForm({
                      id: c.id,
                      name: c.name,
                      zone: c.zone || "La Paz",
                      phone: c.phone ?? "",
                      notes: c.notes ?? "",
                    });
                    setShowForm(true);
                    setFeedback(null);
                  }}
                >
                  <div className="data-card-top">
                    <div>
                      <p className="data-card-title">{c.name}</p>
                      <p className="data-card-meta">
                        {c.zone || "Sin zona"}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {activeClients.length === 0 ? (
              <li className="data-empty">No hay clientes.</li>
            ) : null}
          </ul>
        </>
      ) : (
        <>
          {showForm ? (
            <form className="data-form" onSubmit={onConsSubmit}>
              <h3 className="data-form-title">
                {editingCons ? "Editar consignación" : "Nueva consignación"}
              </h3>
              <div className="field">
                <label htmlFor="co-client">Cliente</label>
                <select
                  id="co-client"
                  required
                  value={consForm.client_id || activeClients[0]?.id || ""}
                  onChange={(e) =>
                    setConsForm((f) => ({ ...f, client_id: e.target.value }))
                  }
                  disabled={pending || activeClients.length === 0}
                >
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="co-qty">Cantidad (aves)</label>
                  <input
                    id="co-qty"
                    type="number"
                    min={1}
                    required={!editingCons}
                    value={consForm.quantity_birds}
                    onChange={(e) =>
                      setConsForm((f) => ({
                        ...f,
                        quantity_birds: e.target.value,
                      }))
                    }
                    disabled={pending || editingCons}
                  />
                </div>
                <div className="field">
                  <label htmlFor="co-price">Precio unit. (opcional)</label>
                  <input
                    id="co-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={consForm.unit_price}
                    onChange={(e) =>
                      setConsForm((f) => ({ ...f, unit_price: e.target.value }))
                    }
                    disabled={pending}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="co-notes">Notas</label>
                <textarea
                  id="co-notes"
                  rows={2}
                  value={consForm.notes}
                  onChange={(e) =>
                    setConsForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  disabled={pending}
                />
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pending || activeClients.length === 0}
                >
                  {editingCons ? "Guardar cambios" : "Registrar"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetConsForm}
                >
                  Cancelar
                </button>
              </div>
              {feedback ? <p className="login-hint">{feedback}</p> : null}
            </form>
          ) : null}

          {!showForm && feedback ? (
            <p className="login-hint">{feedback}</p>
          ) : null}

          <ul className="data-list">
            {consignments.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="data-card"
                  onClick={() => {
                    setConsForm({
                      id: c.id,
                      client_id: c.client_id,
                      quantity_birds: String(c.quantity_birds),
                      unit_price:
                        c.unit_price == null ? "" : String(c.unit_price),
                      notes: c.notes ?? "",
                    });
                    setShowForm(true);
                    setFeedback(null);
                  }}
                >
                  <div className="data-card-top">
                    <div>
                      <p className="data-card-title">
                        {c.clients?.name ?? "Cliente"}
                      </p>
                      <p className="data-card-meta">
                        {formatDateLaPaz(c.left_at)} · {c.quantity_birds} aves ·{" "}
                        {formatBs(c.total_amount)}
                      </p>
                    </div>
                    <span className={`status-pill status-${c.status}`}>
                      {CONSIGNMENT_STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                </button>
              </li>
            ))}
            {consignments.length === 0 ? (
              <li className="data-empty">No hay consignaciones.</li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}
