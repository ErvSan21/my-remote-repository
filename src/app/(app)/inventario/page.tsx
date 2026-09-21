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
      <header className="data-header providers-header">
        <h2 className="module-title">Inventario</h2>
        <div className="debt-total compact">
          <span>Disponible</span>
          <strong>{available}</strong>
        </div>
      </header>

      {error ? <p className="module-note">{error}</p> : null}

      <ul className="data-list">
        {lots.map((l) => (
          <li key={l.id} className="data-card">
            <div className="data-card-top">
              <div>
                <p className="data-card-title">{l.label || "Lote"}</p>
                <p className="data-card-meta">
                  {formatDateLaPaz(l.opened_at)}
                </p>
              </div>
              <p className="data-card-amount">{l.quantity_birds}</p>
            </div>
          </li>
        ))}
        {lots.length === 0 ? (
          <li className="data-empty">Sin lotes abiertos.</li>
        ) : null}
      </ul>

      <ul className="data-list">
        {movements.map((m) => (
          <li key={m.id} className="data-card">
            <div className="data-card-top">
              <div>
                <p className="data-card-title">
                  {INVENTORY_REASON_LABEL[m.reason] ?? m.reason}
                </p>
                <p className="data-card-meta">{formatDateLaPaz(m.moved_at)}</p>
              </div>
              <p className="data-card-amount">
                {m.delta_birds > 0 ? "+" : ""}
                {m.delta_birds}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
