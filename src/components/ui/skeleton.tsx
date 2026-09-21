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
    <div className="data-stack">
      <div className="data-header providers-header">
        <Skeleton className="skeleton-page-title" />
        <Skeleton className="skeleton-plus" />
      </div>
      <Skeleton className="skeleton-search" />
      <SkeletonLines count={cards} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="data-stack" aria-busy="true" aria-label="Cargando">
      <Skeleton className="skeleton-page-title" style={{ width: "40%" }} />
      <Skeleton className="skeleton-line" style={{ width: "60%" }} />
      <section className="metrics-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="metric">
            <Skeleton className="skeleton-line short" />
            <Skeleton className="skeleton-title" />
          </div>
        ))}
      </section>
    </div>
  );
}
