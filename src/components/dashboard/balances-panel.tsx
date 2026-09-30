"use client";

import { useState } from "react";
import { bs0, initials, type PartyKind, type PartySummary } from "@/lib/dashboard-model";

type Props = {
  clients: PartySummary[];
  suppliers: PartySummary[];
  onOpen: (kind: PartyKind, id: string) => void;
};

function statusText(p: PartySummary) {
  if (p.kind === "client") return p.balance > 0 ? "te debe" : "al día";
  if (p.withoutPrice > 0) return p.balance > 0 ? "le debes + sin precio" : `${p.withoutPrice} sin precio`;
  return p.balance > 0 ? "le debes" : "al día";
}

function subText(p: PartySummary) {
  if (p.kind === "client") return p.place ?? `${p.count} ventas`;
  const compras = `${p.count} ${p.count === 1 ? "compra" : "compras"}`;
  return p.place ? `${p.place} · ${compras}` : compras;
}

export function BalancesPanel({ clients, suppliers, onOpen }: Props) {
  const [tab, setTab] = useState<PartyKind>("client");
  const list = tab === "client" ? clients : suppliers;

  return (
    <section className="gp-card gp-balances" aria-label="Saldos">
      <div className="gp-tabs" role="tablist" aria-label="Clientes o proveedores">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "client"}
          className={`gp-tab${tab === "client" ? " is-active" : ""}`}
          onClick={() => setTab("client")}
        >
          Clientes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "supplier"}
          className={`gp-tab${tab === "supplier" ? " is-active" : ""}`}
          onClick={() => setTab("supplier")}
        >
          Proveedores
        </button>
      </div>

      <div className="gp-list" role="tabpanel">
        {list.length === 0 ? (
          <p className="gp-empty">
            {tab === "client" ? "Aún no hay ventas a clientes." : "Aún no hay compras a proveedores."}
          </p>
        ) : (
          list.map((p) => {
            const owes = p.balance > 0;
            const avatar = p.kind === "supplier" ? "gp-avatar-sand" : owes ? "gp-avatar-rust" : "gp-avatar-green";
            return (
              <button key={p.id} type="button" className="gp-row" onClick={() => onOpen(p.kind, p.id)}>
                <span className={`gp-avatar gp-avatar-sm ${avatar}`} aria-hidden>
                  {initials(p.name)}
                </span>
                <span className="gp-row-main">
                  <span className="gp-row-name">{p.name}</span>
                  <span className="gp-row-sub">{subText(p)}</span>
                </span>
                <span className="gp-row-end">
                  <span className="gp-num gp-row-amount">{bs0(p.balance)}</span>
                  <span className="gp-row-status">{statusText(p)}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
