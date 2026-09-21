"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { upsertClientAction } from "@/app/actions/clients";
import { createConsignmentAction } from "@/app/actions/consignments";
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

export function ClientsManager({
  clients,
  consignments,
  listError,
}: Props) {
  const [tab, setTab] = useState<"clientes" | "consignacion">("clientes");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
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
        name: form.name,
        zone: form.zone,
        phone: form.phone,
        notes: form.notes,
      });
      setFeedback(result.message);
      if (result.ok) {
        setForm({ name: "", zone: "La Paz", phone: "", notes: "" });
        setShowForm(false);
      }
    });
  }

  function onConsSubmit(e: FormEvent) {
    e.preventDefault();
    const priceRaw = consForm.unit_price.trim();
    startTransition(async () => {
      const result = await createConsignmentAction({
        client_id: consForm.client_id || activeClients[0]?.id || "",
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
        setShowForm(false);
      }
    });
  }

  return (
    <div className="data-stack">
      <PageHeader
        title="Clientes"
        addLabel={tab === "clientes" ? "Crear cliente" : "Nueva consignación"}
        showAdd={!showForm}
        onAdd={() => {
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
          }}
        >
          Consignación
        </button>
      </div>

      {listError ? <p className="module-note">{listError}</p> : null}
      {feedback ? <p className="login-hint">{feedback}</p> : null}

      {tab === "clientes" ? (
        <>
          {showForm ? (
            <form className="data-form" onSubmit={onClientSubmit}>
              <h3 className="data-form-title">Nuevo cliente</h3>
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
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={pending}>
                  Crear cliente
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}

          <ul className="data-list">
            {activeClients.map((c) => (
              <li key={c.id} className="data-card">
                <div className="data-card-top">
                  <div>
                    <p className="data-card-title">{c.name}</p>
                    <p className="data-card-meta">
                      {c.zone || "Sin zona"}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </p>
                  </div>
                </div>
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
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pending || activeClients.length === 0}
                >
                  Registrar
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}

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
