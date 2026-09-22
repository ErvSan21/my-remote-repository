import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { requireAdmin } from "@/lib/auth/guards";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { createClient } from "@/lib/supabase/server";
import { formatBs } from "@/lib/format";

export const dynamic = "force-dynamic";

function dayBoundsLaPaz() {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
  return {
    start: `${today}T00:00:00-04:00`,
    end: `${today}T23:59:59-04:00`,
    today,
  };
}

function weekStartLaPaz() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }),
  );
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return monday.toLocaleDateString("en-CA");
}

export default async function DashboardPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { start, end } = dayBoundsLaPaz();
  const weekFrom = weekStartLaPaz();

  const [debts, todayPays, weekPays, openVentas] = await Promise.all([
    getSupplierDebtsAction(),
    supabase
      .from("client_payments")
      .select("amount")
      .gte("paid_at", start)
      .lte("paid_at", end),
    supabase
      .from("client_payments")
      .select("amount")
      .gte("paid_at", `${weekFrom}T00:00:00-04:00`),
    supabase
      .from("consignments")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "partial"]),
  ]);

  const cobradoHoy = (todayPays.data ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0,
  );
  const cobradoSemana = (weekPays.data ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0,
  );
  const pendingPrice = debts.purchases.filter(
    (p) => p.status === "pending_price",
  ).length;
  const ventasPendientes = openVentas.count ?? 0;

  return (
    <>
      <section className="hero-dash">
        <h1>Gestión Avícola</h1>
        <p>MAC — ventas, compras, clientes y proveedores.</p>
      </section>

      <section className="metrics-grid" aria-label="Métricas">
        <MetricCard
          label="Deuda proveedores"
          value={debts.error ? "—" : formatBs(debts.totalOwed)}
          hint="Total a todos"
        />
        <MetricCard
          label="Ventas abiertas"
          value={String(ventasPendientes)}
          hint="Pendientes o parciales"
        />
        <MetricCard
          label="Cobrado hoy"
          value={formatBs(cobradoHoy)}
          hint="Clientes · QR + efectivo"
        />
        <MetricCard
          label="Cobrado semana"
          value={formatBs(cobradoSemana)}
          hint={`Desde ${weekFrom}`}
        />
      </section>

      <section className="dash-links" aria-label="Accesos rápidos">
        <Link href="/ventas" className="dash-link-card">
          Ventas
        </Link>
        <Link href="/compras" className="dash-link-card">
          Compras
        </Link>
        <Link href="/clientes" className="dash-link-card">
          Clientes
        </Link>
        <Link href="/proveedores" className="dash-link-card">
          Proveedores
        </Link>
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
