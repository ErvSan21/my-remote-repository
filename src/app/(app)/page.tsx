import Link from "next/link";
import { DashboardBoard } from "@/components/dashboard-board";
import { loadDashboardSource } from "@/lib/dashboard-data";
import { todayLongText } from "@/lib/dashboard-model";
import { requireAdmin } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await requireAdmin();
  const dash = await loadDashboardSource();
  const firstName = (auth.profile.full_name || auth.profile.username || "").trim().split(/\s+/)[0];

  return (
    <div className="dash-page gp">
      <header className="gp-hello">
        <div>
          <p className="gp-date">{todayLongText()}</p>
          <h1 className="gp-num gp-title">{firstName ? `Hola, ${firstName}` : "Hola"}</h1>
        </div>
        <div className="gp-hello-actions gp-only-desktop">
          <Link href="/ventas" className="gp-btn-outline">
            Registrar cobro
          </Link>
          <Link href="/compras" className="gp-btn-dark">
            Nueva compra
          </Link>
        </div>
      </header>
      <DashboardBoard
        ventas={dash.ventas}
        purchases={dash.purchases}
        clientPayments={dash.clientPayments}
        supplierPayments={dash.supplierPayments}
        clients={dash.clients}
        suppliers={dash.suppliers}
        people={dash.people}
        stock={dash.stock}
        loadError={dash.error}
      />
    </div>
  );
}
