import { DashboardBoard } from "@/components/dashboard-board";
import { loadDashboardSource } from "@/lib/dashboard-data";
import { requireAdmin } from "@/lib/auth/guards";
import { weekBoundsLaPaz } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();
  const week = weekBoundsLaPaz();
  const dash = await loadDashboardSource();

  return (
    <div className="dash-page">
      <header className="module-hero module-hero-dash">
        <h1 className="module-hero-title">Dashboard</h1>
      </header>
      <DashboardBoard
        weekFrom={week.from}
        weekTo={week.to}
        ventas={dash.ventas}
        purchases={dash.purchases}
        stock={dash.stock}
        loadError={dash.error}
      />
    </div>
  );
}
