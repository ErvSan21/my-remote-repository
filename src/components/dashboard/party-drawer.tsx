"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  bs0,
  initials,
  whenText,
  type HistoryEntry,
  type PartySummary,
} from "@/lib/dashboard-model";

type Props = {
  party: PartySummary;
  history: HistoryEntry[];
  onClose: () => void;
};

type Filter = "all" | "a" | "b";

export function PartyDrawer({ party, history, onClose }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const closeRef = useRef<HTMLButtonElement>(null);
  const isClient = party.kind === "client";

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const labels: Record<Filter, string> = isClient
    ? { all: "Todo", a: "Ventas", b: "Cobros" }
    : { all: "Todo", a: "Compras", b: "Pagos" };
  const counts: Record<Filter, number> = {
    all: history.length,
    a: history.filter((h) => h.group === "a").length,
    b: history.filter((h) => h.group === "b").length,
  };
  const shown = filter === "all" ? history : history.filter((h) => h.group === filter);
  const pct = party.total > 0 ? Math.min(100, Math.round((party.paid / party.total) * 100)) : 0;
  const owes = party.balance > 0;
  const avgPrice =
    !isClient && party.total > 0 && party.birds > 0 ? party.total / party.birds : null;

  return (
    <div className="gp-drawer-root">
      <button type="button" className="gp-drawer-backdrop" aria-label="Cerrar historial" onClick={onClose} />
      <aside className="gp-drawer" role="dialog" aria-modal="true" aria-labelledby="gp-drawer-title">
        <header className="gp-drawer-head">
          <div className="gp-drawer-id">
            <span
              className={`gp-avatar ${isClient ? "gp-avatar-rust" : "gp-avatar-sand"}`}
              aria-hidden
            >
              {initials(party.name)}
            </span>
            <div className="gp-drawer-names">
              <h2 id="gp-drawer-title" className="gp-num">
                {party.name}
              </h2>
              <p>{[isClient ? "Cliente en consignación" : "Proveedor", party.place].filter(Boolean).join(" · ")}</p>
            </div>
            <button ref={closeRef} type="button" className="gp-drawer-close" aria-label="Cerrar" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="gp-drawer-stats">
            <div>
              <span>{isClient ? "Vendido" : "Comprado"}</span>
              <strong className="gp-num">{bs0(party.total)}</strong>
            </div>
            <div>
              <span>{isClient ? "Cobrado" : "Pagado"}</span>
              <strong className="gp-num gp-green">{bs0(party.paid)}</strong>
            </div>
            <div>
              <span>{isClient ? "Saldo" : "Le debes"}</span>
              <strong className={`gp-num ${owes ? "gp-rust" : "gp-green"}`}>{bs0(party.balance)}</strong>
            </div>
          </div>

          <div
            className="gp-progress"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={isClient ? "Porcentaje cobrado" : "Porcentaje pagado"}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="gp-drawer-extra">
            <span>
              {party.birds.toLocaleString("es-BO")} pollos {isClient ? "entregados" : "comprados"}
            </span>
            <span>
              {isClient
                ? owes
                  ? party.paid > 0
                    ? "Pagó en partes"
                    : "Sin abonos"
                  : "Al día"
                : `Promedio ${avgPrice == null ? "—" : `Bs ${avgPrice.toLocaleString("es-BO", { maximumFractionDigits: 2 })}/pollo`}${party.withoutPrice > 0 ? ` · ${party.withoutPrice} sin precio` : ""}`}
            </span>
          </p>

          <div className="gp-drawer-actions">
            {(["all", "a", "b"] as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`gp-chip${filter === key ? " is-active" : ""}`}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {labels[key]} · {counts[key]}
              </button>
            ))}
            <span className="gp-grow" />
            <Link className="gp-btn-dark gp-drawer-cta" href={isClient ? "/ventas" : "/pagos-proveedores"}>
              {isClient ? "Registrar cobro" : "Registrar pago"}
            </Link>
          </div>
        </header>

        <div className="gp-drawer-body">
          <div className="gp-history">
            <div className="gp-history-head">
              <span>Tipo</span>
              <span>Detalle</span>
              <span>Monto</span>
            </div>
            {shown.length === 0 ? (
              <p className="gp-empty">Sin movimientos.</p>
            ) : (
              shown.map((h) => {
                const pending = h.amount == null;
                const tone = pending ? "is-pending" : h.group === "a" ? "is-a" : "is-b";
                return (
                  <div key={h.key} className="gp-history-row">
                    <span className={`gp-tag ${tone}`}>{h.label}</span>
                    <span className="gp-history-main">
                      <span className="gp-history-detail">{h.detail}</span>
                      <span className="gp-history-meta">
                        {whenText(h.at)}
                        {h.by ? ` · por ${h.by}` : ""}
                      </span>
                    </span>
                    <span className={`gp-num gp-history-amount ${tone}`}>
                      {pending ? "Por definir" : `${h.group === "b" ? "− " : "+ "}${bs0(h.amount)}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
