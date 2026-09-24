"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { upsertClientAction } from "@/app/actions/clients";
import type { Client, VentaRow } from "@/lib/data-types";
import { CLIENT_ZONES, formatBs, formatVentaTitle, formatWhenLaPaz } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { PencilIcon } from "@/components/ui/pencil-icon";
import { LoadMoreButton, useLoadMore } from "@/components/ui/load-more";
import { phoneDigits } from "@/lib/validation";

type Props = {
  clients: Client[];
  ventas: VentaRow[];
  listError: string | null;
};

const emptyClient = {
  id: "" as string,
  name: "",
  zone: "",
  phone: "",
  notes: "",
};

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function ClientsManager({ clients, ventas, listError }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const { shown, more } = useLoadMore(query);

  const activeClients = useMemo(
    () => clients.filter((c) => c.active),
    [clients],
  );
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return activeClients;
    return activeClients.filter((c) =>
      normalize(`${c.name} ${c.zone ?? ""} ${c.phone ?? ""}`).includes(q),
    );
  }, [activeClients, query]);
  const editing = Boolean(form.id);
  const clientSales = useMemo(() => {
    if (!viewing) return [];
    return ventas
      .filter((venta) => venta.client_id === viewing.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [ventas, viewing]);
  const owed = clientSales.reduce(
    (sum, venta) => sum + Number(venta.pending_amount ?? 0),
    0,
  );
  const pendingSales = clientSales.filter((venta) => !venta.is_paid).length;

  function closeForm() {
    setForm(emptyClient);
    setShowForm(false);
  }

  function resetForm() {
    closeForm();
    setFeedback(null);
    setFeedbackOk(false);
  }

  function openClient(client: Client) {
    setViewing(client);
    setShowForm(false);
    setFeedback(null);
    setFeedbackOk(false);
  }

  function openEdit(client: Client) {
    setViewing(client);
    setForm({
      id: client.id,
      name: client.name,
      zone: client.zone || "",
      phone: phoneDigits(client.phone ?? ""),
      notes: client.notes ?? "",
    });
    setShowForm(true);
    setFeedback(null);
    setFeedbackOk(false);
  }

  function goBack() {
    if (showForm && viewing) {
      resetForm();
      return;
    }
    setViewing(null);
    resetForm();
  }

  function onSubmit(e: FormEvent) {
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
      setFeedbackOk(result.ok);
      if (result.ok) {
        if (form.id) {
          setViewing((current) =>
            current && current.id === form.id
              ? {
                  ...current,
                  name: form.name.trim(),
                  zone: form.zone || null,
                  phone: form.phone || null,
                  notes: form.notes || null,
                }
              : current,
          );
        }
        closeForm();
      }
    });
  }

  return (
    <div className="data-stack module-page">
      <PageHeader
        variant="hero"
        title="Clientes"
        addLabel="Nuevo cliente"
        showAdd={!showForm && !viewing}
        onBack={showForm || viewing ? goBack : undefined}
        onAdd={() => {
          setViewing(null);
          setForm(emptyClient);
          setShowForm(true);
          setFeedback(null);
        }}
      />

      {listError ? <p className="module-note">{listError}</p> : null}

      {showForm ? (
        <form className="data-form module-form" onSubmit={onSubmit}>
          <h3 className="data-form-title module-form-title">
            {editing ? "Editar cliente" : "Nuevo cliente"}
          </h3>
          <div className="field">
            <label className="sr-only" htmlFor="cl-name">
              Nombre y apellido
            </label>
            <input
              id="cl-name"
              required
              placeholder="Nombre y apellido"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="cl-zone">
              Dirección / zona
            </label>
            <select
              id="cl-zone"
              className={form.zone ? undefined : "is-placeholder"}
              value={form.zone}
              onChange={(e) =>
                setForm((f) => ({ ...f, zone: e.target.value }))
              }
              disabled={pending}
            >
              <option value="">Dirección / zona</option>
              {[
                ...CLIENT_ZONES,
                ...(form.zone &&
                !(CLIENT_ZONES as readonly string[]).includes(form.zone)
                  ? [form.zone]
                  : []),
              ].map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="cl-phone">
              Celular
            </label>
            <input
              id="cl-phone"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="Celular"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: phoneDigits(e.target.value) }))
              }
              disabled={pending}
            />
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="cl-notes">
              Notas
            </label>
            <textarea
              id="cl-notes"
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
              disabled={pending || !form.name.trim()}
            >
              {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
            </button>
          </div>
          {feedback ? (
            <p
              className={`form-feedback${feedbackOk ? " is-ok" : ""}`}
              role={feedbackOk ? "status" : "alert"}
            >
              {feedback}
            </p>
          ) : null}
        </form>
      ) : null}

      {!showForm && feedback ? (
        <p
          className={`form-feedback${feedbackOk ? " is-ok" : ""}`}
          role={feedbackOk ? "status" : "alert"}
        >
          {feedback}
        </p>
      ) : null}

      {!showForm && viewing ? (
        <>
          <section className="proveedor-summary profile-summary">
            <dl className="profile-facts">
              <div>
                <dt>Nombre</dt>
                <dd>{viewing.name}</dd>
              </div>
              <div>
                <dt>Dirección</dt>
                <dd>{viewing.zone || "Sin dirección"}</dd>
              </div>
              <div>
                <dt>Celular</dt>
                <dd>{viewing.phone || "Sin celular"}</dd>
              </div>
              <div>
                <dt>Notas</dt>
                <dd>{viewing.notes?.trim() || "Sin notas"}</dd>
              </div>
              <div>
                <dt>Debe</dt>
                <dd className={owed > 0.001 ? "cliente-debe" : undefined}>
                  {owed > 0.001 ? formatBs(owed) : "Sin saldo pendiente"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="proveedor-icon-btn is-edit"
              aria-label="Editar cliente"
              title="Editar"
              onClick={() => openEdit(viewing)}
            >
              <PencilIcon size={16} />
            </button>
          </section>
          <p className="cliente-ventas-note">
            {pendingSales > 0
              ? `${pendingSales} ${pendingSales === 1 ? "venta pendiente" : "ventas pendientes"} de pago`
              : "No tiene ventas pendientes de pago"}
          </p>
          <ul className="data-list">
            {clientSales.map((venta) => (
              <li key={venta.id}>
                <Link href={`/ventas/${venta.id}`} className="data-card proveedor-compra">
                  <div>
                    <p className="data-card-title">{formatVentaTitle(venta.sale_number)}</p>
                    <p className="data-card-meta">{venta.quantity_birds} Unidades</p>
                    <p className="data-card-meta">{formatWhenLaPaz(venta.created_at)}</p>
                  </div>
                  <div className="proveedor-compra-side">
                    <span
                      className={
                        venta.is_paid
                          ? "compra-status-tag is-paid"
                          : "compra-status-tag is-pending"
                      }
                    >
                      {venta.is_paid ? "Pagado" : "Pendiente"}
                    </span>
                    <p className="proveedor-compra-amount">
                      {venta.is_paid ? formatBs(venta.total_amount) : formatBs(venta.pending_amount)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            {clientSales.length === 0 ? (
              <li className="data-empty">Este cliente no tiene ventas.</li>
            ) : null}
          </ul>
        </>
      ) : null}

      {!showForm && !viewing ? (
        <div className="search-bar">
          <label htmlFor="cl-search" className="sr-only">
            Buscar cliente
          </label>
          <input
            id="cl-search"
            type="search"
            placeholder="Buscar por nombre apellido o celular"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : null}

      {!showForm && !viewing ? (
      <>
      <ul className="data-list">
        {visible.slice(0, shown).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="data-card provider-card-plain"
              onClick={() => openClient(c)}
            >
              <p className="data-card-title">{c.name}</p>
              <p className="provider-dept">{c.zone || "Sin dirección"}</p>
              <p className="data-card-meta">{c.phone || "Sin celular"}</p>
            </button>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="data-empty">
            {activeClients.length === 0 ? (
              <>
                <p className="data-empty-title">No hay clientes</p>
                <p>Toca + para agregar el primero.</p>
              </>
            ) : (
              <>
                <p className="data-empty-title">Sin resultados</p>
                <p>Prueba con otro nombre, zona o celular.</p>
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
