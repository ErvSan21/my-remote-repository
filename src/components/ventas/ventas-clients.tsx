"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientPaymentAction } from "@/app/actions/client-payments";
import type { VentaRow } from "@/lib/data-types";
import { initials, whenText } from "@/lib/dashboard-model";
import { formatVentaTitle } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type ClientCard = {
  id: string;
  name: string;
  zone: string | null;
  delivered: number;
  collected: number;
  balance: number;
  birds: number;
  sales: VentaRow[];
};

type Props = {
  ventas: VentaRow[];
  people: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const METHOD: Record<string, string> = { cash: "Efectivo", qr: "QR", on_delivery: "Contra entrega" };

function bs(n: number) {
  return `Bs ${Math.round(n).toLocaleString("es-BO")}`;
}

function bs2(n: number) {
  return `Bs ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function groupByClient(rows: VentaRow[]): ClientCard[] {
  const map = new Map<string, ClientCard>();
  for (const v of rows) {
    let card = map.get(v.client_id);
    if (!card) {
      card = {
        id: v.client_id,
        name: v.clients?.name ?? "Cliente",
        zone: v.clients?.zone ?? null,
        delivered: 0,
        collected: 0,
        balance: 0,
        birds: 0,
        sales: [],
      };
      map.set(v.client_id, card);
    }
    card.delivered += Number(v.total_amount ?? 0);
    // Lo cobrado de cada venta no pasa de su total (evita porcentajes > 100%).
    const paid = Number(v.paid_amount ?? 0);
    card.collected += v.total_amount == null ? paid : Math.min(paid, Number(v.total_amount));
    card.balance += v.is_paid ? 0 : Number(v.pending_amount ?? 0);
    card.birds += Number(v.quantity_birds ?? 0);
    card.sales.push(v);
  }
  return [...map.values()].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
}

function statusText(c: ClientCard) {
  if (c.balance <= 0) return "al día";
  return c.collected > 0 ? "pagó en partes" : "sin abonos";
}

export function VentasClients({ ventas, people, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [payFor, setPayFor] = useState<string | null>(null);

  const allCards = useMemo(() => groupByClient(ventas), [ventas]);
  const shown = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return allCards;
    return allCards.filter((c) =>
      normalize(
        `${c.name} ${c.zone ?? ""} ${c.sales.map((v) => `${v.clients?.phone ?? ""} ${formatVentaTitle(v.sale_number)}`).join(" ")}`,
      ).includes(q),
    );
  }, [allCards, query]);

  const withBalance = allCards.filter((c) => c.balance > 0).length;
  const totalDue = allCards.reduce((sum, c) => sum + c.balance, 0);
  const totalBirds = allCards.reduce((sum, c) => sum + c.birds, 0);

  const detail = useMemo(() => {
    if (!selectedId) return null;
    return groupByClient(ventas.filter((v) => v.client_id === selectedId))[0] ?? null;
  }, [ventas, selectedId]);

  const payCard = payFor
    ? groupByClient(ventas.filter((v) => v.client_id === payFor))[0] ?? null
    : null;

  if (selectedId && detail) {
    return (
      <div className="gv">
        <ClientDetail card={detail} people={people} onCobrar={() => setPayFor(detail.id)} />
        {payCard ? <CobroDialog card={payCard} onClose={() => setPayFor(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="gv">
      <section className="gv-summary">
        <span className="gv-summary-label">Total por cobrar en consignación</span>
        <span className="gp-num gv-summary-value">{bs(totalDue)}</span>
        <span className="gv-summary-label">
          {withBalance} {withBalance === 1 ? "cliente con saldo" : "clientes con saldo"} ·{" "}
          {totalBirds.toLocaleString("es-BO")} pollos entregados
        </span>
      </section>

      <div className="gv-search">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
        </svg>
        <label htmlFor="gv-search" className="sr-only">
          Buscar
        </label>
        <input
          id="gv-search"
          type="search"
          placeholder="Buscar cliente, celular o venta"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {shown.length === 0 ? (
        <div className="gv-empty">
          <p className="gv-empty-title">{ventas.length === 0 ? "No hay ventas" : "Sin resultados"}</p>
          <p>
            {ventas.length === 0
              ? "Toca + para anotar la primera."
              : "Prueba con otro nombre, celular o venta."}
          </p>
        </div>
      ) : (
        <ul className="gv-list">
          {shown.map((c) => {
            const pct = c.delivered > 0 ? Math.min(100, Math.round((c.collected / c.delivered) * 100)) : 0;
            const owes = c.balance > 0;
            return (
              <li key={c.id} className="gv-card">
                <button type="button" className="gv-card-top" onClick={() => onSelect(c.id)}>
                  <span className={`gv-avatar ${owes ? "is-owes" : "is-clear"}`} aria-hidden>
                    {initials(c.name)}
                  </span>
                  <span className="gv-card-main">
                    <span className="gv-card-name">{c.name}</span>
                    <span className="gv-card-sub">
                      {c.zone ?? `${c.sales.length} ${c.sales.length === 1 ? "venta" : "ventas"}`}
                    </span>
                  </span>
                  <span className="gv-card-end">
                    <span className="gp-num gv-card-balance">{bs(c.balance)}</span>
                    <span className="gv-card-status">{statusText(c)}</span>
                  </span>
                </button>
                <div className="gv-progress" aria-hidden>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="gv-card-foot">
                  <span>
                    Cobrado {bs(c.collected)} de {bs(c.delivered)}
                  </span>
                  {owes ? (
                    <button type="button" className="gv-btn-dark gv-btn-sm" onClick={() => setPayFor(c.id)}>
                      Cobrar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {payCard ? <CobroDialog card={payCard} onClose={() => setPayFor(null)} /> : null}
    </div>
  );
}

function ClientDetail({
  card,
  people,
  onCobrar,
}: {
  card: ClientCard;
  people: Record<string, string>;
  onCobrar: () => void;
}) {
  const pct = card.delivered > 0 ? Math.min(100, Math.round((card.collected / card.delivered) * 100)) : 0;

  const history = useMemo(() => {
    const who = (id: string | null) => (id ? people[id] ?? null : null);
    const rows: {
      key: string;
      kind: "venta" | "cobro";
      at: string;
      detail: string;
      by: string | null;
      amount: number | null;
      href: string;
    }[] = [];
    for (const v of card.sales) {
      const price =
        v.unit_price == null
          ? "precio pendiente"
          : `${bs2(Number(v.unit_price))} c/u`;
      rows.push({
        key: `v-${v.id}`,
        kind: "venta",
        at: v.created_at,
        detail: `${Number(v.quantity_birds).toLocaleString("es-BO")} pollos · ${price} · ${formatVentaTitle(v.sale_number)}`,
        by: who(v.created_by),
        amount: v.total_amount == null ? null : Number(v.total_amount),
        href: `/ventas/${v.id}`,
      });
      for (const p of v.payments ?? []) {
        rows.push({
          key: `c-${p.id}`,
          kind: "cobro",
          at: p.paid_at,
          detail: `${METHOD[p.method] ?? p.method} · ${formatVentaTitle(v.sale_number)}`,
          by: who(p.recorded_by),
          amount: Number(p.amount),
          href: `/ventas/${v.id}`,
        });
      }
    }
    return rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  }, [card, people]);

  return (
    <>
      <section className="gv-detail">
        {card.zone ? <p className="gv-detail-zone">{card.zone}</p> : null}
        <div>
          <p className="gv-detail-label">Saldo pendiente</p>
          <p className="gp-num gv-detail-balance">{bs(card.balance)}</p>
        </div>
        <div className="gv-progress gv-progress-lg" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="gv-detail-stats">
          <div>
            <span>Entregado</span>
            <strong className="gp-num">{bs(card.delivered)}</strong>
          </div>
          <div>
            <span>Cobrado</span>
            <strong className="gp-num gv-green">{bs(card.collected)}</strong>
          </div>
        </div>
        {card.balance > 0 ? (
          <button type="button" className="gv-btn-dark gv-btn-lg" onClick={onCobrar}>
            Registrar cobro
          </button>
        ) : null}
      </section>

      <div className="gv-history-head">
        <h2 className="gv-section-title">Historial completo</h2>
        <span>{card.birds.toLocaleString("es-BO")} pollos en total</span>
      </div>

      <ul className="gv-history">
        {history.map((h) => (
          <li key={h.key}>
            <Link href={h.href} className="gv-history-row">
              <span className={`gv-pill ${h.kind === "venta" ? (h.amount == null ? "is-pending" : "is-sale") : "is-cobro"}`}>
                {h.kind === "venta" ? "Venta" : "Cobro"}
              </span>
              <span className="gv-history-main">
                <span className="gv-history-detail">{h.detail}</span>
                <span className="gv-history-meta">
                  {whenText(h.at)}
                  {h.by ? ` · por ${h.by}` : ""}
                </span>
              </span>
              <span
                className={`gp-num gv-history-amount ${h.kind === "venta" ? (h.amount == null ? "is-pending" : "is-sale") : "is-cobro"}`}
              >
                {h.amount == null ? "Por definir" : `${h.kind === "cobro" ? "− " : "+ "}${bs(h.amount)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function CobroDialog({ card, onClose }: { card: ClientCard; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const pendingSales = card.sales
    .filter((v) => !v.is_paid && Number(v.pending_amount ?? 0) > 0)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const [saleId, setSaleId] = useState(pendingSales[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sale = pendingSales.find((v) => v.id === saleId) ?? null;
  const maxAmount = sale ? Number(sale.pending_amount ?? 0) : 0;
  const amountNum = Number(amount.replace(",", "."));
  const valid = Boolean(sale) && Number.isFinite(amountNum) && amountNum > 0 && amountNum <= maxAmount + 0.001;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sale || !valid) {
      setError("El monto no puede superar el saldo de la venta.");
      return;
    }
    startTransition(async () => {
      const result = await createClientPaymentAction({
        client_id: card.id,
        consignment_id: sale.id,
        amount: amountNum,
        method,
        notes: "",
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      ref.current?.close();
      router.refresh();
    });
  }

  return (
    <dialog
      ref={ref}
      className="pay-dialog gv-dialog"
      aria-labelledby="gv-pay-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <form className="data-form pay-dialog-form" onSubmit={onSubmit}>
        <h3 id="gv-pay-title" className="data-form-title">
          Cobro a {card.name}
        </h3>
        <p className="venta-pending-banner">
          <span>Saldo pendiente</span>
          <strong>{bs2(card.balance)}</strong>
        </p>
        <div className="field">
          <label htmlFor="gv-sale">Venta</label>
          <select id="gv-sale" value={saleId} onChange={(e) => setSaleId(e.target.value)} disabled={pending}>
            {pendingSales.map((v) => (
              <option key={v.id} value={v.id}>
                {formatVentaTitle(v.sale_number)} · debe {bs2(Number(v.pending_amount ?? 0))}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gv-amt">Monto (Bs)</label>
          <input
            id="gv-amt"
            inputMode="decimal"
            autoComplete="off"
            required
            value={amount}
            placeholder={maxAmount ? String(maxAmount) : ""}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label htmlFor="gv-method">Método</label>
          <select
            id="gv-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            disabled={pending}
          >
            <option value="cash">Efectivo</option>
            <option value="qr">QR</option>
          </select>
        </div>
        <div className="form-actions form-actions-split">
          <button type="button" className="btn-secondary btn-form" onClick={() => ref.current?.close()} disabled={pending}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary btn-form" disabled={!valid || pending}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
        {error ? (
          <p className="form-feedback" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </dialog>
  );
}
