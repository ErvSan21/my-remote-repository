import type { CSSProperties } from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="data-card skeleton-card">
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export function PageListSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="data-stack module-page" aria-busy="true" aria-label="Cargando">
      <header className="module-hero">
        <div className="module-hero-top">
          <Skeleton className="skeleton-page-title skeleton-on-navy" />
        </div>
        <div className="module-hero-actions">
          <Skeleton className="skeleton-cta skeleton-on-navy" />
          <Skeleton className="skeleton-icon-btn skeleton-on-navy" />
        </div>
      </header>
      <div className="sheet-filters">
        <Skeleton className="skeleton-search" />
      </div>
      <SkeletonLines count={cards} />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="data-stack" aria-busy="true" aria-label="Cargando">
      <header className="venta-detail-header">
        <div className="venta-detail-title-row">
          <Skeleton className="skeleton-icon-btn" />
          <Skeleton className="skeleton-page-title" />
          <Skeleton className="skeleton-icon-btn" />
        </div>
        <Skeleton className="skeleton-line short" />
      </header>
      <div className="data-form skeleton-card">
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line short" />
      </div>
    </div>
  );
}

/** Inicio: saludo, 4 cards, gráfico y saldos. */
export function DashboardSkeleton() {
  return (
    <div className="dash-page gp" aria-busy="true" aria-label="Cargando">
      <header className="gp-hello">
        <div>
          <Skeleton className="skeleton-line" style={{ width: "9rem" }} />
          <Skeleton className="skeleton-page-title" style={{ width: "11rem", marginTop: "0.5rem" }} />
        </div>
      </header>
      <section className="gp-kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="gp-kpi">
            <Skeleton className="skeleton-line" style={{ width: "60%" }} />
            <Skeleton className="skeleton-title" style={{ height: "1.6rem", width: "75%" }} />
            <Skeleton className="skeleton-line short" />
          </div>
        ))}
      </section>
      <div className="gp-main">
        <div className="gp-card gp-chart">
          <Skeleton className="skeleton-title" />
          <Skeleton style={{ height: "150px", width: "100%", borderRadius: "12px" }} />
        </div>
        <div className="gp-side">
          <div className="gp-card">
            <Skeleton className="skeleton-search" />
            <Skeleton className="skeleton-line" style={{ marginTop: "0.9rem" }} />
            <Skeleton className="skeleton-line short" style={{ marginTop: "0.6rem" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clientes y Compras: resumen, buscador y cards. */
export function PartyListSkeleton() {
  return (
    <div className="data-stack module-page" aria-busy="true" aria-label="Cargando">
      <div className="gv">
        <Skeleton style={{ height: "7rem", width: "100%", borderRadius: "20px" }} />
        <Skeleton style={{ height: "48px", width: "100%", borderRadius: "12px" }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="gv-card">
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Skeleton style={{ width: "42px", height: "42px", borderRadius: "999px", flexShrink: 0 }} />
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Skeleton className="skeleton-title" />
                <Skeleton className="skeleton-line short" />
              </div>
            </div>
            <Skeleton style={{ height: "8px", width: "100%", borderRadius: "4px" }} />
            <Skeleton className="skeleton-line" style={{ width: "55%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
