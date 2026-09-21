"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  setClientActiveAction,
  upsertClientAction,
} from "@/app/actions/clients";
import {
  createConsignmentAction,
  updateConsignmentPriceAction,
} from "@/app/actions/consignments";
import type { Client, Consignment } from "@/lib/data-types";
import {
  CLIENT_ZONES,
  CONSIGNMENT_STATUS_LABEL,
  formatBs,
  formatDateLaPaz,
} from "@/lib/format";

type Props = {
  clients: Client[];
  consignments: Consignment[];
  availableStock: number;
  listError: string | null;
};

export function ClientsManager({
  clients,
  consignments,
  availableStock,
  listError,
}: Props) {
  const [tab, setTab] = useState<"clientes" | "consignacion">("clientes");
  const [form, setForm] = useState({
    id: "",
    name: "",
    zone: "La Paz",
    phone: "",
    notes: "",
  });
  const [consForm, setConsForm] = useState({
    client_id: "",
    quantity_birds: "",
    unit_price: "",
    notes: "",
  });
  const [priceEdit, setPriceEdit] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );

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
      if (result.ok) {
        setForm({ id: "", name: "", zone: "La Paz", phone: "", notes: "" });
      }
    });
  }

  function onConsSubmit(e: FormEvent) {
    e.preventDefault();
    const priceRaw = consForm.unit_price.trim();
    startTransition(async () => {
      const result = await createConsignmentAction({
        client_id: consForm.client_id,
        quantity_birds: Number(consForm.quantity_birds),
        unit_price: priceRaw === "" ? null : Number(priceRaw),
        notes: consForm.notes,
      });
      setFeedback(result.message);
      if (result.ok) {
        setConsForm({
          client_id: activeClients[0]?.id ?? "",
          quantity_birds: "",
          unit_price: "",
          notes: "",
        });
      }
    });
  }

  return (
    <div className="data-stack">
      <header className="data-header">
        <div>
          <h2 className="module-title">Clientes / Consignación</h2>
          <p className="module-desc">
            Clientes en La Paz / El Alto y pollo dejado en consignación. Stock
            disponible: <strong>{availableStock}</strong> aves.
          </p>
        </div>
      </header>

      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn ${tab === "clientes" ? "is-active" : ""}`}
          onClick={() => setTab("clientes")}
        >
          Clientes
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "consignacion" ? "is-active" : ""}`}
          onClick={() => setTab("consignacion")}
        >
          Consignación
        </button>
      </div>

      {listError ? <p className="module-note">{listError}</p> : null}
      {feedback ? <p className="login-hint">{feedback}</p> : null}

      {tab === "clientes" ? (
        <>
          <form className="data-form" onSubmit={onClientSubmit}>
            <h3 className="data-form-title">
              {form.id ? "Editar cliente" : "Nuevo cliente"}
            </h3>
            <div className="field">
              <label htmlFor="cl-name">Nombre</label>
              <input
                id="cl-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                <label htmlFor="cl-phone">Teléfono</label>
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
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                disabled={pending}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={pending}>
                {form.id ? "Guardar" : "Crear"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setForm({
                      id: "",
                      name: "",
                      zone: "La Paz",
                      phone: "",
                      notes: "",
                    })
                  }
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>

          <ul className="data-list">
            {clients.map((c) => (
              <li key={c.id} className={`data-card ${c.active ? "" : "is-muted"}`}>
                <div className="data-card-top">
                  <div>
                    <p className="data-card-title">{c.name}</p>
                    <p className="data-card-meta">
                      {c.zone || "Sin zona"}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </p>
                  </div>
                </div>
                <div className="data-card-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setForm({
                        id: c.id,
                        name: c.name,
                        zone: c.zone || "Otro",
                        phone: c.phone || "",
                        notes: c.notes || "",
                      })
                    }
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setClientActiveAction(c.id, !c.active);
                        setFeedback(r.message);
                      })
                    }
                  >
                    {c.active ? "Desactivar" : "Reactivar"}
                  </button>
                </div>
              </li>
            ))}
            {clients.length === 0 ? (
              <li className="data-empty">No hay clientes.</li>
            ) : null}
          </ul>
        </>
      ) : (
        <>
          <form className="data-form" onSubmit={onConsSubmit}>
            <h3 className="data-form-title">Nueva consignación</h3>
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
                    {c.name} ({c.zone || "—"})
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
                  required
                  value={consForm.quantity_birds}
                  onChange={(e) =>
                    setConsForm((f) => ({
                      ...f,
                      quantity_birds: e.target.value,
                    }))
                  }
                  disabled={pending}
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
            <button
              type="submit"
              className="btn-primary"
              disabled={pending || activeClients.length === 0}
            >
              Registrar consignación
            </button>
          </form>

          <ul className="data-list">
            {consignments.map((c) => (
              <li key={c.id} className="data-card">
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
                {c.unit_price == null ? (
                  <div className="field-row" style={{ marginTop: "0.6rem" }}>
                    <div className="field">
                      <label>Fijar precio</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={priceEdit[c.id] ?? ""}
                        onChange={(e) =>
                          setPriceEdit((m) => ({
                            ...m,
                            [c.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field" style={{ justifyContent: "flex-end" }}>
                      <label>&nbsp;</label>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          startTransition(async () => {
                            const r = await updateConsignmentPriceAction({
                              id: c.id,
                              unit_price: Number(priceEdit[c.id]),
                            });
                            setFeedback(r.message);
                          })
                        }
                      >
                        Guardar precio
                      </button>
                    </div>
                  </div>
                ) : null}
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
