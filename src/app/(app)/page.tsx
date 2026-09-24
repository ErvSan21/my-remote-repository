import Link from "next/link";
import { DashRange } from "@/components/dash-range";
import { MetricCard } from "@/components/metric-card";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { formatBs } from "@/lib/format";

export const dynamic = "force-dynamic";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function todayLaPaz() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
}

function dayStart(date: string) {
  return `${date}T00:00:00-04:00`;
}

function dayEnd(date: string) {
  return `${date}T23:59:59-04:00`;
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
  const sameDay = from === to;
  const hint = sameDay
    ? from === today
      ? "Del día"
      : "Del día elegido"
    : "Del periodo";

  const supabase = await createClient();
  const ventasQuery = rangeInvalid
    ? { data: [] as { id: string; total_amount: number | null }[] }
    : await supabase
        .from("consignments")
        .select("id, total_amount")
        .gte("created_at", dayStart(from))
        .lte("created_at", dayEnd(to));
  const comprasQuery = rangeInvalid
    ? { data: [] as { id: string; total_amount: number | null; status: string | null }[] }
    : await supabase
        .from("purchases")
        .select("id, total_amount, status")
        .gte("purchase_date", from)
        .lte("purchase_date", to);

  const ventas = ventasQuery.data ?? [];
  const compras = comprasQuery.data ?? [];
  const ventaIds = ventas.map((row) => row.id as string);
  const compraIds = compras.map((row) => row.id as string);

  const [cobrosRes, pagosRes] = await Promise.all([
    ventaIds.length
      ? supabase
          .from("client_payments")
          .select("consignment_id, amount")
          .in("consignment_id", ventaIds)
      : Promise.resolve({ data: [] }),
    compraIds.length
      ? supabase
          .from("supplier_payments")
          .select("purchase_id, amount")
          .in("purchase_id", compraIds)
      : Promise.resolve({ data: [] }),
  ]);

  const cobrado = new Map<string, number>();
  for (const row of cobrosRes.data ?? []) {
    const id = row.consignment_id as string;
    cobrado.set(id, (cobrado.get(id) ?? 0) + Number(row.amount ?? 0));
  }
  const pagado = new Map<string, number>();
  for (const row of pagosRes.data ?? []) {
    const id = row.purchase_id as string | null;
    if (!id) continue;
    pagado.set(id, (pagado.get(id) ?? 0) + Number(row.amount ?? 0));
  }

  const ventasTotal = ventas.reduce(
    (sum, row) => sum + Number(row.total_amount ?? 0),
    0,
  );
  const comprasTotal = compras.reduce(
    (sum, row) => sum + Number(row.total_amount ?? 0),
    0,
  );
  const porCobrar = ventas.reduce((sum, row) => {
    const total = Number(row.total_amount ?? 0);
    const paid = cobrado.get(row.id as string) ?? 0;
    return sum + Math.max(0, Math.round((total - paid) * 100) / 100);
  }, 0);
  const porPagar = compras.reduce((sum, row) => {
    if (row.total_amount == null) return sum;
    const total = Number(row.total_amount);
    const paid = pagado.get(row.id as string) ?? 0;
    return sum + Math.max(0, Math.round((total - paid) * 100) / 100);
  }, 0);
  const pendingPrice = compras.filter(
    (row) => row.status === "pending_price" || row.total_amount == null,
  ).length;

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
    </div>
  );
}
