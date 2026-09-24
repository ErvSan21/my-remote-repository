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

export function DashboardSkeleton() {
  return (
    <div className="dash-page" aria-busy="true" aria-label="Cargando">
      <header className="module-hero module-hero-dash">
        <Skeleton
          className="skeleton-page-title skeleton-on-navy"
          style={{ width: "11rem" }}
        />
      </header>
      <div className="dash-range">
        <Skeleton className="skeleton-search" />
        <Skeleton className="skeleton-search" />
      </div>
      <section className="metrics-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="metric">
            <div className="metric-head">
              <Skeleton className="skeleton-icon-btn" style={{ width: "1.85rem", height: "1.85rem" }} />
              <Skeleton className="skeleton-line" />
            </div>
            <Skeleton className="skeleton-title" />
          </div>
        ))}
      </section>
    </div>
  );
}
