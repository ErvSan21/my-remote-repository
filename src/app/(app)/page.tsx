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

export default async function DashboardPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { start, end, today } = dayBoundsLaPaz();

  const [debts, ventasHoyRes, comprasHoyRes, consignmentsRes, paymentsRes] =
    await Promise.all([
      getSupplierDebtsAction(),
      supabase
        .from("consignments")
        .select("total_amount")
        .gte("created_at", start)
        .lte("created_at", end),
      supabase
        .from("purchases")
        .select("total_amount, purchase_date, created_at")
        .gte("purchase_date", today)
        .lte("purchase_date", today),
      supabase
        .from("consignments")
        .select("id, total_amount, status")
        .in("status", ["open", "partial"]),
      supabase
        .from("client_payments")
        .select("consignment_id, amount")
        .not("consignment_id", "is", null),
    ]);

  const ventasHoy = (ventasHoyRes.data ?? []).reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0,
  );
  const comprasHoy = (comprasHoyRes.data ?? []).reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0,
  );

  const paidByCons = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    const id = p.consignment_id as string;
    paidByCons.set(id, (paidByCons.get(id) ?? 0) + Number(p.amount));
  }
  const porCobrar = (consignmentsRes.data ?? []).reduce((s, c) => {
    const total = Number(c.total_amount ?? 0);
    const paid = paidByCons.get(c.id as string) ?? 0;
    return s + Math.max(0, total - paid);
  }, 0);

  const porPagar = debts.error ? null : debts.totalOwed;
  const pendingPrice = debts.purchases.filter(
    (p) => p.status === "pending_price",
  ).length;

  return (
    <div className="dash-page">
      <header className="module-hero module-hero-dash">
        <h1 className="module-hero-title">Dashboard MAC</h1>
      </header>

      <section className="metrics-grid" aria-label="Métricas">
        <MetricCard
          label="Ventas Hoy"
          value={formatBs(ventasHoy)}
          hint="Registradas hoy"
          tone="orange"
        />
        <MetricCard
          label="Compras Hoy"
          value={formatBs(comprasHoy)}
          hint="Registradas hoy"
          tone="orange"
        />
        <MetricCard
          label="Cuentas por Cobrar"
          value={formatBs(porCobrar)}
          hint="Ventas abiertas"
          tone="blue"
        />
        <MetricCard
          label="Cuentas por Pagar"
          value={porPagar == null ? "—" : formatBs(porPagar)}
          hint="Deuda proveedores"
          tone="blue"
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
    </div>
  );
}
