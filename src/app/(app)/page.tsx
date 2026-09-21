import { MetricCard } from "@/components/metric-card";

export default function DashboardPage() {
  return (
    <>
      <section className="hero-dash">
        <h1>Sistema Pollo</h1>
        <p>
          Panel de control — deudas, consignación en La Paz/El Alto y pollo
          disponible. Los números se conectan a Supabase en el próximo sprint.
        </p>
      </section>

      <section className="metrics-grid" aria-label="Métricas">
        <MetricCard
          label="Deuda proveedores"
          value="—"
          hint="Total + por proveedor"
        />
        <MetricCard
          label="Consignado abierto"
          value="—"
          hint="Aves en La Paz / El Alto"
        />
        <MetricCard label="Cobrado hoy" value="—" hint="QR + efectivo" />
        <MetricCard
          label="Pollo disponible"
          value="—"
          hint="Inventario actual"
        />
      </section>

      <p className="setup-banner">
        Greenfield: crea el proyecto Supabase, aplica{" "}
        <code>supabase/migrations/001_initial_schema.sql</code>, copia{" "}
        <code>.env.local.example</code> → <code>.env.local</code> y despliega en
        Vercel. Ver README.
      </p>
    </>
  );
}
