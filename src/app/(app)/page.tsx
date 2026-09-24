import Link from "next/link";
import { listVentasAction } from "@/app/actions/consignments";
import { listPurchasesAction } from "@/app/actions/purchases";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { DashRange } from "@/components/dash-range";
import { MetricCard } from "@/components/metric-card";
import { requireAdmin } from "@/lib/auth/guards";
import { purchaseBalance } from "@/lib/debts";
import { formatBs } from "@/lib/format";

export const dynamic = "force-dynamic";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function todayLaPaz() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
}

function dayKey(iso: string | null | undefined) {
  if (!iso) return "";
  if (DATE_KEY.test(iso)) return iso;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
}

function inRange(day: string, from: string, to: string) {
  return Boolean(day) && day >= from && day <= to;
}

type Props = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const today = todayLaPaz();
  const from = params.from && DATE_KEY.test(params.from) ? params.from : today;
  const to = params.to && DATE_KEY.test(params.to) ? params.to : today;
  const rangeInvalid = from > to;
  const hint = from === to ? (from === today ? "Del día" : "Del día elegido") : "Del periodo";

  const [ventasRes, purchasesRes, debts] = await Promise.all([
    listVentasAction(),
    listPurchasesAction(),
    getSupplierDebtsAction(),
  ]);
  const loadError = ventasRes.error || purchasesRes.error || debts.error;

  const ventas = rangeInvalid
    ? []
    : ventasRes.ventas.filter((venta) => inRange(dayKey(venta.created_at), from, to));
  const compras = rangeInvalid
    ? []
    : purchasesRes.purchases.filter((purchase) =>
        inRange(dayKey(purchase.created_at || purchase.purchase_date), from, to),
      );

  const ventasTotal = ventas.reduce(
    (sum, venta) => sum + Number(venta.total_amount ?? 0),
    0,
  );
  const comprasTotal = compras.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
    0,
  );
  const porCobrar = ventasRes.ventas.reduce(
    (sum, venta) => sum + Number(venta.pending_amount ?? 0),
    0,
  );
  const porPagar = debts.totalOwed;
  const pendingPrice = compras.filter((purchase) => {
    const balance = purchaseBalance(purchase.total_amount, purchase.paid_amount ?? 0);
    return !balance.has_price;
  }).length;

  return (
    <div className="dash-page">
      <header className="module-hero module-hero-dash">
        <h1 className="module-hero-title">Dashboard</h1>
      </header>

      <DashRange from={from} to={to} />
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
      {!loadError && !rangeInvalid && ventas.length === 0 && compras.length === 0 ? (
        <p className="dash-range-note">
          No hay ventas ni compras en este día. Las cuentas muestran el saldo pendiente.
        </p>
      ) : null}

      <section className="metrics-grid" aria-label="Métricas">
        <MetricCard
          icon="ventas"
          label="Ventas"
          value={formatBs(ventasTotal)}
          hint={hint}
          tone="orange"
        />
        <MetricCard
          icon="compras"
          label="Compras"
          value={formatBs(comprasTotal)}
          hint={hint}
          tone="orange"
        />
        <MetricCard
          icon="cobrar"
          label="Cuentas por cobrar"
          value={formatBs(porCobrar)}
          hint="Saldo actual"
          tone="blue"
        />
        <MetricCard
          icon="pagar"
          label="Cuentas por pagar"
          value={formatBs(porPagar)}
          hint="Saldo actual"
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
    </div>
  );
}
