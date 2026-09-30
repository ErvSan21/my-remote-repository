"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { BalancesPanel } from "@/components/dashboard/balances-panel";
import { PartyDrawer } from "@/components/dashboard/party-drawer";
import { SalesChart } from "@/components/dashboard/sales-chart";
import type {
  DashboardParty,
  DashboardPayment,
  DashboardPurchase,
  DashboardSale,
} from "@/lib/dashboard-data";
import {
  bs0,
  clientSummaries,
  initials,
  lastWeekRange,
  monthCompare,
  partyHistory,
  recentActivity,
  salesBuckets,
  sortByBalance,
  supplierSummaries,
  type PartyKind,
  type PartyRef,
} from "@/lib/dashboard-model";

type Props = {
  ventas: DashboardSale[];
  purchases: DashboardPurchase[];
  clientPayments: DashboardPayment[];
  supplierPayments: DashboardPayment[];
  clients: DashboardParty[];
  suppliers: DashboardParty[];
  people: Record<string, string>;
  stock: number;
  loadError: string | null;
};

export function DashboardBoard({
  ventas,
  purchases,
  clientPayments,
  supplierPayments,
  clients,
  suppliers,
  people,
  stock,
  loadError,
}: Props) {
  const [open, setOpen] = useState<PartyRef | null>(null);
  const openParty = useCallback((kind: PartyKind, id: string) => setOpen({ kind, id }), []);
  const closeParty = useCallback(() => setOpen(null), []);

  const clientList = useMemo(
    () => sortByBalance(clientSummaries(clients, ventas)),
    [clients, ventas],
  );
  const supplierList = useMemo(
    () => sortByBalance(supplierSummaries(suppliers, purchases)),
    [suppliers, purchases],
  );
  const activity = useMemo(
    () => recentActivity(ventas, purchases, clientPayments, supplierPayments, clients, suppliers, people),
    [ventas, purchases, clientPayments, supplierPayments, clients, suppliers, people],
  );
  const week = useMemo(() => {
    const range = lastWeekRange();
    return salesBuckets(ventas, range.from, range.to);
  }, [ventas]);
  const month = useMemo(() => monthCompare(ventas), [ventas]);

  const porCobrar = clientList.reduce((sum, c) => sum + c.balance, 0);
  const conSaldo = clientList.filter((c) => c.balance > 0).length;
  const porPagar = supplierList.reduce((sum, s) => sum + s.balance, 0);
  const deudores = clientList.filter((c) => c.balance > 0).slice(0, 3);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const unpriced = purchases
    .filter((p) => p.total_amount == null)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const pend = unpriced[0] ?? null;

  const openSummary = open
    ? (open.kind === "client"
        ? clientSummaries(clients, ventas)
        : supplierSummaries(suppliers, purchases)
      ).find((p) => p.id === open.id) ?? null
    : null;

  return (
    <>
      {loadError ? (
        <p className="form-feedback" role="alert">
          No se pudieron cargar los datos. {loadError}
        </p>
      ) : null}

      <section className="gp-kpis" aria-label="Resumen">
        <Link href="/ventas" className="gp-kpi gp-kpi-dark">
          <span className="gp-kpi-label">Ventas del mes</span>
          <span className="gp-num gp-kpi-value">{bs0(month.current)}</span>
          <span className="gp-kpi-foot gp-kpi-trend">
            {month.pct == null
              ? `Sin ventas en ${month.prevMonth} para comparar`
              : `${month.pct >= 0 ? "▲" : "▼"} ${Math.abs(month.pct)}% vs. ${month.prevMonth}`}
          </span>
        </Link>
        <Link href="/ventas" className="gp-kpi">
          <span className="gp-kpi-label">Por cobrar</span>
          <span className="gp-num gp-kpi-value gp-green">{bs0(porCobrar)}</span>
          <span className="gp-kpi-foot">
            {conSaldo} {conSaldo === 1 ? "cliente con saldo" : "clientes con saldo"}
          </span>
        </Link>
        <Link href="/pagos-proveedores" className="gp-kpi">
          <span className="gp-kpi-label">Por pagar a proveedores</span>
          <span className="gp-num gp-kpi-value gp-rust">{bs0(porPagar)}</span>
          <span className="gp-kpi-foot">
            {unpriced.length > 0
              ? `+ ${unpriced.length} ${unpriced.length === 1 ? "compra sin precio" : "compras sin precio"}`
              : "Todas las compras con precio"}
          </span>
        </Link>
        <Link href="/inventario" className="gp-kpi">
          <span className="gp-kpi-label">Stock en cámara</span>
          <span className="gp-num gp-kpi-value">
            {stock.toLocaleString("es-BO")} <small>pollos</small>
          </span>
          <span className="gp-kpi-foot">Aves disponibles</span>
        </Link>
      </section>

      <div className="gp-main">
        <SalesChart buckets={week} />

        <div className="gp-side">
          {pend ? (
            <section className="gp-alert" aria-label="Compra sin precio">
              <span className="gp-alert-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v2M12 19v2M17 7.5c-.8-1.2-2.6-2-5-2-2.8 0-4.5 1.3-4.5 3.2 0 4.3 9.5 2.2 9.5 6.6 0 1.9-1.9 3.2-5 3.2-2.4 0-4.2-.8-5-2" />
                </svg>
              </span>
              <div className="gp-alert-body">
                <p className="gp-alert-title">
                  {unpriced.length === 1 ? "Compra sin precio fijado" : `${unpriced.length} compras sin precio fijado`}
                </p>
                <p className="gp-alert-text">
                  <button type="button" className="gp-alert-party" onClick={() => openParty("supplier", pend.supplier_id)}>
                    {supplierName.get(pend.supplier_id) ?? "Proveedor"}
                  </button>
                  {" · "}
                  {pend.quantity_birds.toLocaleString("es-BO")} pollos
                </p>
              </div>
              <Link className="gp-btn-dark gp-alert-cta" href={`/compras/${pend.id}/editar`}>
                <span className="gp-only-desktop">Fijar precio</span>
                <span className="gp-only-mobile">Fijar</span>
              </Link>
            </section>
          ) : null}

          <div className="gp-only-desktop gp-fill">
            <BalancesPanel clients={clientList} suppliers={supplierList} onOpen={openParty} />
          </div>
        </div>
      </div>

      <section className="gp-only-mobile gp-owe" aria-label="Quién te debe">
        <div className="gp-section-head">
          <h2 className="gp-section-title">Quién te debe</h2>
          <Link href="/ventas" className="gp-see-all">
            Ver todo
          </Link>
        </div>
        {deudores.length === 0 ? (
          <p className="gp-empty">Nadie te debe por ahora.</p>
        ) : (
          deudores.map((c) => (
            <button key={c.id} type="button" className="gp-owe-row" onClick={() => openParty("client", c.id)}>
              <span className="gp-avatar gp-avatar-rust" aria-hidden>
                {initials(c.name)}
              </span>
              <span className="gp-owe-main">
                <span className="gp-owe-name">{c.name}</span>
                <span className="gp-owe-sub">{c.place ?? `${c.count} ventas`}</span>
              </span>
              <span className="gp-num gp-owe-amount">{bs0(c.balance)}</span>
            </button>
          ))
        )}
      </section>

      <ActivityFeed items={activity} onOpen={openParty} />

      {openSummary && open ? (
        <PartyDrawer
          key={`${open.kind}-${open.id}`}
          party={openSummary}
          history={partyHistory(open, ventas, purchases, clientPayments, supplierPayments, people)}
          onClose={closeParty}
        />
      ) : null}
    </>
  );
}
