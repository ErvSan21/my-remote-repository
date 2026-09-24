"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashRange } from "@/components/dash-range";
import { MetricCard } from "@/components/metric-card";
import type { DashboardPurchase, DashboardSale } from "@/lib/dashboard-data";
import { dayKeyLaPaz, inDateRange } from "@/lib/dates";
import { purchaseBalance } from "@/lib/debts";
import { formatBs } from "@/lib/format";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

type Props = {
  weekFrom: string;
  weekTo: string;
  ventas: DashboardSale[];
  purchases: DashboardPurchase[];
  stock: number;
  loadError: string | null;
};

function formatCount(count: number, label: string) {
  const units = count.toLocaleString("es-BO", { maximumFractionDigits: 0 });
  return `${units} ${label}`;
}

export function DashboardBoard({
  weekFrom,
  weekTo,
  ventas,
  purchases,
  stock,
  loadError,
}: Props) {
  const [from, setFrom] = useState(weekFrom);
  const [to, setTo] = useState(weekTo);
  const rangeInvalid = Boolean(from && to && from > to);
  const isWeek = from === weekFrom && to === weekTo;
  const hint = isWeek ? "De la semana" : from === to ? "Del día elegido" : "Del periodo";

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("from") && !url.searchParams.has("to")) return;
    url.searchParams.delete("from");
    url.searchParams.delete("to");
    const query = url.searchParams.toString();
    window.history.replaceState(window.history.state, "", query ? `${url.pathname}?${query}` : url.pathname);
  }, []);

  const ventasInRange = useMemo(
    () =>
      rangeInvalid
        ? []
        : ventas.filter((venta) => inDateRange(dayKeyLaPaz(venta.created_at), from, to)),
    [ventas, from, to, rangeInvalid],
  );
  const comprasInRange = useMemo(
    () =>
      rangeInvalid
        ? []
        : purchases.filter((purchase) =>
            inDateRange(dayKeyLaPaz(purchase.created_at || purchase.purchase_date), from, to),
          ),
    [purchases, from, to, rangeInvalid],
  );

  const ventasTotal = ventasInRange.reduce(
    (sum, venta) => sum + Number(venta.total_amount ?? 0),
    0,
  );
  const comprasTotal = comprasInRange.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
    0,
  );
  const ventasQty = ventasInRange.reduce(
    (sum, venta) => sum + Number(venta.quantity_birds ?? 0),
    0,
  );
  const comprasQty = comprasInRange.reduce(
    (sum, purchase) => sum + Number(purchase.quantity_birds ?? 0),
    0,
  );
  const porCobrar = ventasInRange.reduce(
    (sum, venta) => sum + Number(venta.pending_amount ?? 0),
    0,
  );
  const utilidad = Math.round((ventasTotal - comprasTotal) * 100) / 100;
  const porPagar = comprasInRange.reduce((sum, purchase) => {
    const balance = purchaseBalance(purchase.total_amount, purchase.paid_amount ?? 0);
    return sum + (balance.pending_amount ?? 0);
  }, 0);
  const pendingPrice = comprasInRange.filter((purchase) => {
    const balance = purchaseBalance(purchase.total_amount, purchase.paid_amount ?? 0);
    return !balance.has_price;
  }).length;

  function pickFrom(value: string) {
    if (!DATE_KEY.test(value)) return;
    setFrom(value);
  }

  function pickTo(value: string) {
    if (!DATE_KEY.test(value)) return;
    setTo(value);
  }

  return (
    <>
      <DashRange from={from} to={to} onFrom={pickFrom} onTo={pickTo} />
      {rangeInvalid ? (
        <p className="form-feedback dash-range-note" role="alert">
          La fecha de inicio es posterior a la de fin.
        </p>
      ) : null}
      {loadError ? (
        <p className="form-feedback dash-range-note" role="alert">
          No se pudieron cargar los datos. {loadError}
        </p>
      ) : null}
      {!loadError && !rangeInvalid && ventasInRange.length === 0 && comprasInRange.length === 0 ? (
        <p className="dash-range-note">
          {isWeek
            ? "No hay ventas ni compras en esta semana."
            : "No hay ventas ni compras en este periodo."}
        </p>
      ) : null}

      <section className="metrics-grid" aria-label="Métricas">
        <MetricCard
          icon="ventas"
          label="Ventas"
          value={formatBs(ventasTotal)}
          detail={formatCount(ventasQty, "vendidas")}
          hint={hint}
          tone="orange"
        />
        <MetricCard
          icon="compras"
          label="Compras"
          value={formatBs(comprasTotal)}
          detail={formatCount(comprasQty, "disponibles")}
          hint={hint}
          tone="orange"
        />
        <MetricCard
          icon="utilidad"
          label="Utilidad"
          value={formatBs(utilidad)}
          hint={pendingPrice > 0 ? "Falta precio en compras" : hint}
          tone="green"
        />
        <MetricCard
          icon="stock"
          label="Stock"
          value={stock.toLocaleString("es-BO", { maximumFractionDigits: 0 })}
          hint="Aves disponibles"
          tone="blue"
        />
        <MetricCard
          icon="cobrar"
          label="Cuentas por cobrar"
          value={formatBs(porCobrar)}
          hint={hint}
          tone="blue"
        />
        <MetricCard
          icon="pagar"
          label="Cuentas por pagar"
          value={formatBs(porPagar)}
          hint={hint}
          tone="blue"
        />
      </section>

      {pendingPrice > 0 ? (
        <p className="setup-banner">
          Compras sin precio: <strong>{pendingPrice}</strong>
          {" · "}
          <Link href="/compras">Ver compras</Link>
        </p>
      ) : null}
    </>
  );
}
