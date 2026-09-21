import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { requireAdmin } from "@/lib/auth/guards";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { getPolloDisponible } from "@/lib/inventory";
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
  const debts = await getSupplierDebtsAction();
  const available = await getPolloDisponible();
  const { start, end } = dayBoundsLaPaz();
  const weekFrom = weekStartLaPaz();

  const [todayPays, weekPays] = await Promise.all([
    supabase
      .from("client_payments")
      .select("amount")
      .gte("paid_at", start)
      .lte("paid_at", end),
    supabase
      .from("client_payments")
      .select("amount")
      .gte("paid_at", `${weekFrom}T00:00:00-04:00`),
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

  return (
    <>
      <section className="hero-dash">
        <h1>MAC</h1>
        <p>Resumen operativo — deudas, stock y cobros.</p>
      </section>

      <section className="metrics-grid" aria-label="Métricas">
        <MetricCard
          label="Deuda proveedores"
          value={debts.error ? "—" : formatBs(debts.totalOwed)}
          hint="Total a todos"
        />
        <MetricCard
          label="Pollo disponible"
          value={`${available}`}
          hint="Aves en lotes abiertos"
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

      <p className="setup-banner">
        Compras sin precio: <strong>{pendingPrice}</strong>
        {" · "}
        <Link href="/proveedores">Proveedores</Link>
        {" · "}
        <Link href="/compras">Compras</Link>
        {" · "}
        <Link href="/pagos-proveedores">Pagos prov.</Link>
        {" · "}
        <Link href="/clientes">Clientes</Link>
        {" · "}
        <Link href="/pagos">Cobros</Link>
        {" · "}
        <Link href="/inventario">Inventario</Link>
        {" · "}
        <Link href="/cierres">Cierres PDF</Link>
      </p>
    </>
  );
}
