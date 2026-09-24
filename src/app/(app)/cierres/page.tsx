import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { listSuppliersForClosure } from "@/app/actions/closures";
import { weekBoundsLaPaz } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CierresPage() {
  await requireAdmin();
  const suppliers = await listSuppliersForClosure();
  const week = weekBoundsLaPaz();

  return (
    <div className="data-stack">
      <header className="data-header">
        <h2 className="module-title">Cierres</h2>
      </header>

      <ul className="data-list">
        <li className="data-card">
          <div className="data-card-top">
            <p className="data-card-title">Cierre semanal</p>
            <Link
              className="btn-secondary"
              href={`/cierres/semanal?from=${week.from}&to=${week.to}`}
            >
              Abrir
            </Link>
          </div>
        </li>
        {suppliers.map((s) => (
          <li key={s.id} className="data-card">
            <div className="data-card-top">
              <p className="data-card-title">{s.name}</p>
              <Link
                className="btn-secondary"
                href={`/cierres/proveedor/${s.id}`}
              >
                Abrir
              </Link>
            </div>
          </li>
        ))}
        {suppliers.length === 0 ? (
          <li className="data-empty">Sin proveedores.</li>
        ) : null}
      </ul>
    </div>
  );
}
