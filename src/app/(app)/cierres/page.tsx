import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { listSuppliersForClosure } from "@/app/actions/closures";

export const dynamic = "force-dynamic";

function weekRangeLaPaz() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }),
  );
  const day = now.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-CA");
  return { from: fmt(monday), to: fmt(sunday) };
}

export default async function CierresPage() {
  await requireAdmin();
  const suppliers = await listSuppliersForClosure();
  const week = weekRangeLaPaz();

  return (
    <div className="data-stack">
      <header className="data-header">
        <div>
          <h2 className="module-title">Cierres / PDF</h2>
          <p className="module-desc">
            Abre el resumen e imprime o guarda como PDF desde el navegador.
          </p>
        </div>
      </header>

      <section className="data-form">
        <h3 className="data-form-title">Cierre semanal general</h3>
        <p className="module-desc">
          Semana actual (La Paz): {week.from} → {week.to}
        </p>
        <Link
          className="btn-primary"
          href={`/cierres/semanal?from=${week.from}&to=${week.to}`}
          style={{ display: "inline-block", width: "auto", textAlign: "center" }}
        >
          Abrir cierre semanal
        </Link>
      </section>

      <section className="data-form">
        <h3 className="data-form-title">Cierre por proveedor</h3>
        <ul className="data-list" style={{ marginTop: "0.75rem" }}>
          {suppliers.map((s) => (
            <li key={s.id} className="data-card">
              <div className="data-card-top">
                <p className="data-card-title">{s.name}</p>
                <Link className="btn-secondary" href={`/cierres/proveedor/${s.id}`}>
                  Ver / imprimir
                </Link>
              </div>
            </li>
          ))}
          {suppliers.length === 0 ? (
            <li className="data-empty">Crea proveedores primero.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
