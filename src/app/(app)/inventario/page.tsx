import { requireAdmin } from "@/lib/auth/guards";
import { getInventoryAction } from "@/app/actions/inventory";
import {
  INVENTORY_REASON_LABEL,
  formatDateLaPaz,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  await requireAdmin();
  const { available, lots, movements, error } = await getInventoryAction();

  return (
    <div className="data-stack">
      <header className="data-header">
        <div>
          <h2 className="module-title">Inventario</h2>
          <p className="module-desc">
            Pollo disponible según lotes abiertos (entradas por compra, salidas
            por consignación).
          </p>
        </div>
        <div className="debt-total">
          <span>Pollo disponible</span>
          <strong>{available} aves</strong>
        </div>
      </header>

      {error ? <p className="module-note">{error}</p> : null}

      <h3 className="data-form-title">Lotes abiertos</h3>
      <ul className="data-list">
        {lots.map((l) => (
          <li key={l.id} className="data-card">
            <div className="data-card-top">
              <div>
                <p className="data-card-title">{l.label || "Lote"}</p>
                <p className="data-card-meta">
                  Abierto {formatDateLaPaz(l.opened_at)}
                </p>
              </div>
              <p className="data-card-amount">{l.quantity_birds} aves</p>
            </div>
          </li>
        ))}
        {lots.length === 0 ? (
          <li className="data-empty">Sin lotes abiertos. Registra una compra.</li>
        ) : null}
      </ul>

      <h3 className="data-form-title">Movimientos recientes</h3>
      <ul className="data-list">
        {movements.map((m) => (
          <li key={m.id} className="data-card">
            <div className="data-card-top">
              <div>
                <p className="data-card-title">
                  {INVENTORY_REASON_LABEL[m.reason] ?? m.reason}
                </p>
                <p className="data-card-meta">
                  {formatDateLaPaz(m.moved_at)}
                  {m.notes ? ` · ${m.notes}` : ""}
                </p>
              </div>
              <p className="data-card-amount">
                {m.delta_birds > 0 ? "+" : ""}
                {m.delta_birds}
              </p>
            </div>
          </li>
        ))}
        {movements.length === 0 ? (
          <li className="data-empty">Sin movimientos aún.</li>
        ) : null}
      </ul>
    </div>
  );
}
