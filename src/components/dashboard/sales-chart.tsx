import { bs0, compactBs, type DayBucket } from "@/lib/dashboard-model";

type Props = {
  buckets: DayBucket[];
};

/** Ventas de los últimos 7 días; la barra de hoy va resaltada. */
export function SalesChart({ buckets }: Props) {
  const max = Math.max(...buckets.map((b) => b.total), 0);
  const total = buckets.reduce((sum, b) => sum + b.total, 0);

  return (
    <section className="gp-card gp-chart" aria-label="Ventas últimos 7 días">
      <div className="gp-section-head">
        <h2 className="gp-card-title">Ventas últimos 7 días</h2>
        <p className="gp-num gp-chart-total">{bs0(total)}</p>
      </div>
      <div className="gp-bars">
        {buckets.map((b, i) => {
          const pct = max > 0 ? Math.max(b.total / max, b.total > 0 ? 0.04 : 0) : 0;
          const isToday = i === buckets.length - 1;
          return (
            <div key={b.key} className="gp-bar" title={`${b.longLabel}: ${bs0(b.total)} · ${b.count} ventas`}>
              <span className="gp-num gp-bar-value">{b.total > 0 ? compactBs(b.total) : ""}</span>
              <span className="gp-bar-track">
                <span className={`gp-bar-fill${isToday ? " is-today" : ""}`} style={{ height: `${pct * 100}%` }} />
              </span>
              <span className="gp-bar-label">{b.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
