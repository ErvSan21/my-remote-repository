import { MetricCard } from "@/components/metric-card";
import { requireAdmin } from "@/lib/auth/guards";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { formatBs } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();
  const debts = await getSupplierDebtsAction();
  const pendingPrice = debts.purchases.filter(
    (p) => p.status === "pending_price",
  ).length;

  return (
    <>
      <section className="hero-dash">
        <h1>Sistema Pollo</h1>
        <p>
          Deudas a proveedores y operación diaria. Sprint 1: proveedores,
          compras y pagos.
        </p>
      </section>

      <section className="metrics-grid" aria-label="Métricas">
        <MetricCard
          label="Deuda proveedores"
          value={debts.error ? "—" : formatBs(debts.totalOwed)}
          hint="Total a todos"
        />
        <MetricCard
          label="Proveedores con deuda"
          value={
            debts.error
              ? "—"
              : String(debts.perSupplier.filter((s) => s.owed > 0).length)
          }
          hint="Con saldo > 0"
        />
        <MetricCard
          label="Compras sin precio"
          value={String(pendingPrice)}
          hint="Negociación pendiente"
        />
        <MetricCard
          label="Pollo disponible"
          value="—"
          hint="Inventario — próximo"
        />
      </section>

      <p className="setup-banner">
        Atajos:{" "}
        <Link href="/proveedores">Proveedores</Link>
        {" · "}
        <Link href="/compras">Compras</Link>
        {" · "}
        <Link href="/pagos-proveedores">Pagos proveedores</Link>
      </p>
    </>
  );
}
