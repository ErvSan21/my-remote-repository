"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupplierPaymentAction } from "@/app/actions/supplier-payments";
import type { Purchase, Supplier } from "@/lib/data-types";
import { PageHeader } from "@/components/ui/page-header";
import { initials, whenText } from "@/lib/dashboard-model";
import { purchaseBalance } from "@/lib/debts";
import type { PaymentMethod } from "@/lib/types";

export type SupplierPaymentRow = {
  id: string;
  supplier_id: string;
  purchase_id: string | null;
  amount: number;
  method: string;
  paid_at: string;
  recorded_by: string | null;
};

type SupplierCard = {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  total: number;
  paid: number;
  balance: number;
  birds: number;
  withoutPrice: Purchase[];
  purchases: Purchase[];
  payments: SupplierPaymentRow[];
};

type Props = {
  suppliers: Supplier[];
  purchases: Purchase[];
  payments: SupplierPaymentRow[];
  people: Record<string, string>;
  listError: string | null;
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

function pendingOf(p: Purchase) {
  return purchaseBalance(p.total_amount, Number(p.paid_amount ?? 0)).pending_amount ?? 0;
}

function buildCards(suppliers: Supplier[], purchases: Purchase[], payments: SupplierPaymentRow[]): SupplierCard[] {
  const byId = new Map<string, SupplierCard>();
  const ensure = (id: string, fallback?: Purchase) => {
    let card = byId.get(id);
    if (!card) {
      const s = suppliers.find((x) => x.id === id);
      card = {
        id,
        name: s?.name ?? fallback?.suppliers?.name ?? "Proveedor",
        location: s?.location ?? fallback?.suppliers?.location ?? null,
        phone: s?.phone ?? fallback?.suppliers?.phone ?? null,
        total: 0,
        paid: 0,
        balance: 0,
        birds: 0,
        withoutPrice: [],
        purchases: [],
        payments: [],
      };
      byId.set(id, card);
    }
    return card;
  };
  for (const p of purchases) {
    const card = ensure(p.supplier_id, p);
    const total = Number(p.total_amount ?? 0);
    const pending = pendingOf(p);
    card.total += total;
    // Lo pagado de cada compra no pasa de su total.
    card.paid += p.total_amount == null ? 0 : total - pending;
    card.balance += pending;
    card.birds += Number(p.quantity_birds ?? 0);
    if (p.total_amount == null) card.withoutPrice.push(p);
    card.purchases.push(p);
  }
  for (const pay of payments) {
    if (byId.has(pay.supplier_id)) byId.get(pay.supplier_id)!.payments.push(pay);
  }
  return [...byId.values()].sort(
    (a, b) => b.balance - a.balance || b.withoutPrice.length - a.withoutPrice.length || a.name.localeCompare(b.name),
  );
}

function statusText(c: SupplierCard) {
  if (c.withoutPrice.length > 0) return c.balance > 0 ? "le debes + sin precio" : "sin precio";
  if (c.balance <= 0) return "al día";
  return c.paid > 0 ? "pagaste en partes" : "sin pagos";
}

/** Pestaña "Compras": proveedores con su saldo, historial y pagos. */
export function ComprasManager({ suppliers, purchases, payments, people, listError }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);

  const cards = useMemo(() => buildCards(suppliers, purchases, payments), [suppliers, purchases, payments]);
  const shown = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return cards;
    return cards.filter((c) => normalize(`${c.name} ${c.location ?? ""} ${c.phone ?? ""}`).includes(q));
  }, [cards, query]);

  const totalDue = cards.reduce((sum, c) => sum + c.balance, 0);
  const owing = cards.filter((c) => c.balance > 0).length;
  const unpriced = cards.reduce((sum, c) => sum + c.withoutPrice.length, 0);
  const detail = selected ? cards.find((c) => c.id === selected) ?? null : null;
  const payCard = payFor ? cards.find((c) => c.id === payFor) ?? null : null;

  return (
    <div className="data-stack module-page">
      {detail ? (
        <PageHeader variant="hero" title={detail.name} showAdd={false} onBack={() => setSelected(null)} />
      ) : null}

      {listError ? <p className="module-note">{listError}</p> : null}

      <div className="gv">
        {detail ? (
          <SupplierDetail card={detail} people={people} onPay={() => setPayFor(detail.id)} />
        ) : (
          <>
            <section className="gv-summary gv-summary-rust">
              <span className="gv-summary-label">Total por pagar a proveedores</span>
              <span className="gp-num gv-summary-value">{bs(totalDue)}</span>
              <span className="gv-summary-label">
                {owing} {owing === 1 ? "proveedor con saldo" : "proveedores con saldo"}
                {unpriced > 0 ? ` · ${unpriced} ${unpriced === 1 ? "compra sin precio" : "compras sin precio"}` : ""}
              </span>
            </section>

            <div className="gv-search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
              </svg>
              <label htmlFor="gc-search" className="sr-only">
                Buscar
              </label>
              <input
                id="gc-search"
                type="search"
                placeholder="Buscar proveedor, origen o celular"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {shown.length === 0 ? (
              <div className="gv-empty">
                <p className="gv-empty-title">{cards.length === 0 ? "No hay compras" : "Sin resultados"}</p>
                <p>
                  {cards.length === 0
                    ? "Usa el botón + para registrar la primera."
                    : "Prueba con otro nombre, origen o celular."}
                </p>
              </div>
            ) : (
              <ul className="gv-list">
                {shown.map((c) => {
                  const pct = c.total > 0 ? Math.min(100, Math.round((c.paid / c.total) * 100)) : 0;
                  return (
                    <li key={c.id} className="gv-card">
                      <button type="button" className="gv-card-top" onClick={() => setSelected(c.id)}>
                        <span className="gv-avatar is-sand" aria-hidden>
                          {initials(c.name)}
                        </span>
                        <span className="gv-card-main">
                          <span className="gv-card-name">{c.name}</span>
                          <span className="gv-card-sub">
                            {[c.location, `${c.purchases.length} ${c.purchases.length === 1 ? "compra" : "compras"}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="gv-card-end">
                          <span className={`gp-num gv-card-balance${c.balance > 0 ? " gv-rust" : ""}`}>{bs(c.balance)}</span>
                          <span className="gv-card-status">{statusText(c)}</span>
                        </span>
                      </button>
                      <div className="gv-progress" aria-hidden>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <div className="gv-card-foot">
                        <span>
                          Pagado {bs(c.paid)} de {bs(c.total)}
                        </span>
                        {c.balance > 0 ? (
                          <button type="button" className="gv-btn-dark gv-btn-sm" onClick={() => setPayFor(c.id)}>
                            Pagar
                          </button>
                        ) : c.withoutPrice.length > 0 ? (
                          <Link href={`/compras/${c.withoutPrice[0].id}/editar`} className="gv-btn-dark gv-btn-sm gv-btn-link">
                            Fijar precio
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {payCard ? <PagoDialog card={payCard} onClose={() => setPayFor(null)} /> : null}
    </div>
  );
}

function SupplierDetail({
  card,
  people,
  onPay,
}: {
  card: SupplierCard;
  people: Record<string, string>;
  onPay: () => void;
}) {
  const pct = card.total > 0 ? Math.min(100, Math.round((card.paid / card.total) * 100)) : 0;
  const priced = card.purchases.filter((p) => p.total_amount != null);
  const pricedBirds = priced.reduce((sum, p) => sum + Number(p.quantity_birds ?? 0), 0);
  const avg = pricedBirds > 0 ? card.total / pricedBirds : null;

  const history = useMemo(() => {
    const who = (id: string | null | undefined) => (id ? people[id] ?? null : null);
    const purchaseCode = new Map(card.purchases.map((p) => [p.id, p.purchase_date]));
    const rows: {
      key: string;
      kind: "compra" | "pago";
      at: string;
      detail: string;
      by: string | null;
      amount: number | null;
      href: string | null;
    }[] = [];
    for (const p of card.purchases) {
      rows.push({
        key: `p-${p.id}`,
        kind: "compra",
        at: p.created_at || p.purchase_date,
        detail: `${Number(p.quantity_birds).toLocaleString("es-BO")} pollos · ${
          p.unit_price == null ? "precio pendiente" : `${bs2(Number(p.unit_price))} c/u`
        }`,
        by: who(p.created_by),
        amount: p.total_amount == null ? null : Number(p.total_amount),
        href: `/compras/${p.id}`,
      });
    }
    for (const pay of card.payments) {
      const date = pay.purchase_id ? purchaseCode.get(pay.purchase_id) : null;
      rows.push({
        key: `s-${pay.id}`,
        kind: "pago",
        at: pay.paid_at,
        detail: `${METHOD[pay.method] ?? pay.method}${date ? ` · compra del ${whenText(date)}` : " · a cuenta"}`,
        by: who(pay.recorded_by),
        amount: pay.amount,
        href: pay.purchase_id ? `/compras/${pay.purchase_id}` : null,
      });
    }
    return rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  }, [card, people]);

  return (
    <>
      <section className="gv-detail">
        <p className="gv-detail-zone">
          {[card.location ? `Proveedor de ${card.location}` : "Proveedor", `${card.purchases.length} compras`].join(" · ")}
        </p>
        <div>
          <p className="gv-detail-label">Le debes</p>
          <p className={`gp-num gv-detail-balance${card.balance > 0 ? " gv-rust" : ""}`}>{bs(card.balance)}</p>
        </div>
        <div className="gv-progress gv-progress-lg" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="gv-detail-stats">
          <div>
            <span>Total comprado</span>
            <strong className="gp-num">{bs(card.total)}</strong>
          </div>
          <div>
            <span>Pagado</span>
            <strong className="gp-num gv-green">{bs(card.paid)}</strong>
          </div>
          <div>
            <span>Pollos</span>
            <strong className="gp-num">{card.birds.toLocaleString("es-BO")}</strong>
          </div>
          <div>
            <span>Precio promedio</span>
            <strong className="gp-num">{avg == null ? "—" : `${bs2(avg)}`}</strong>
          </div>
        </div>
        {card.withoutPrice.length > 0 ? (
          <div className="gv-warn">
            <span>
              {card.withoutPrice.length === 1
                ? `Compra sin precio · ${Number(card.withoutPrice[0].quantity_birds).toLocaleString("es-BO")} pollos`
                : `${card.withoutPrice.length} compras sin precio`}
            </span>
            <Link href={`/compras/${card.withoutPrice[0].id}/editar`} className="gv-btn-dark gv-btn-sm gv-btn-link">
              Fijar precio
            </Link>
          </div>
        ) : null}
        {card.balance > 0 ? (
          <button type="button" className="gv-btn-dark gv-btn-lg" onClick={onPay}>
            Registrar pago
          </button>
        ) : null}
      </section>

      <div className="gv-history-head">
        <h2 className="gv-section-title">Historial completo</h2>
        <span>{card.birds.toLocaleString("es-BO")} pollos en total</span>
      </div>

      <ul className="gv-history">
        {history.map((h) => {
          const tone = h.kind === "compra" ? (h.amount == null ? "is-pending" : "is-sale") : "is-cobro";
          const body = (
            <>
              <span className={`gv-pill ${tone}`}>{h.kind === "compra" ? "Compra" : "Pago"}</span>
              <span className="gv-history-main">
                <span className="gv-history-detail">{h.detail}</span>
                <span className="gv-history-meta">
                  {whenText(h.at)}
                  {h.by ? ` · por ${h.by}` : ""}
                </span>
              </span>
              <span className={`gp-num gv-history-amount ${tone}`}>
                {h.amount == null ? "Por definir" : `${h.kind === "pago" ? "− " : "+ "}${bs(h.amount)}`}
              </span>
            </>
          );
          return (
            <li key={h.key}>
              {h.href ? (
                <Link href={h.href} className="gv-history-row">
                  {body}
                </Link>
              ) : (
                <div className="gv-history-row">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PagoDialog({ card, onClose }: { card: SupplierCard; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const open = card.purchases
    .filter((p) => pendingOf(p) > 0)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const [purchaseId, setPurchaseId] = useState(open[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const purchase = open.find((p) => p.id === purchaseId) ?? null;
  const max = purchase ? pendingOf(purchase) : 0;
  const amountNum = Number(amount.replace(",", "."));
  const valid = Boolean(purchase) && Number.isFinite(amountNum) && amountNum > 0 && amountNum <= max + 0.001;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!purchase || !valid) {
      setError("El monto no puede superar el saldo de la compra.");
      return;
    }
    startTransition(async () => {
      const result = await createSupplierPaymentAction({
        supplier_id: card.id,
        purchase_id: purchase.id,
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
      className="pay-dialog"
      aria-labelledby="gc-pay-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <form className="data-form pay-dialog-form" onSubmit={onSubmit}>
        <h3 id="gc-pay-title" className="data-form-title">
          Pago a {card.name}
        </h3>
        <p className="venta-pending-banner">
          <span>Le debes</span>
          <strong>{bs2(card.balance)}</strong>
        </p>
        <div className="field">
          <label htmlFor="gc-purchase">Compra</label>
          <select id="gc-purchase" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} disabled={pending}>
            {open.map((p) => (
              <option key={p.id} value={p.id}>
                {whenText(p.created_at || p.purchase_date)} · {Number(p.quantity_birds).toLocaleString("es-BO")} pollos · debe{" "}
                {bs2(pendingOf(p))}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gc-amt">Monto (Bs)</label>
          <input
            id="gc-amt"
            inputMode="decimal"
            autoComplete="off"
            required
            value={amount}
            placeholder={max ? String(max) : ""}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            disabled={pending}
          />
        </div>
        <div className="field">
          <label htmlFor="gc-method">Método</label>
          <select id="gc-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} disabled={pending}>
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
