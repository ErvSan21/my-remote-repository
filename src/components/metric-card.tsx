type MetricIcon = "ventas" | "compras" | "cobrar" | "pagar";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "orange" | "blue";
  icon: MetricIcon;
};

function MetricGlyph({ icon }: { icon: MetricIcon }) {
  if (icon === "ventas") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 15l3.5-3.5 2.5 2L20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "compras") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 7h15l-1.5 9h-12L5 4H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="20" r="1.2" fill="currentColor" />
        <circle cx="18" cy="20" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "cobrar") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18M12 14v3M10.5 15.5 12 14l1.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M12 17v-3M10.5 15.5 12 17l1.5-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "blue",
  icon,
}: MetricCardProps) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-head">
        <div className="metric-icon" aria-hidden>
          <MetricGlyph icon={icon} />
        </div>
        <p className="metric-label">{label}</p>
      </div>
      <p className="metric-value">{value}</p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  );
}
