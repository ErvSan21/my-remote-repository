type MetricIcon = "ventas" | "compras" | "cobrar" | "pagar" | "stock" | "utilidad";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  hint?: string;
  tone?: "orange" | "blue" | "green";
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
  if (icon === "stock") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3.5 20 7.5 12 11.5 4 7.5 12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M4 7.5V16.5L12 20.5L20 16.5V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 11.5V20.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (icon === "utilidad") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7.5v9M9.2 9.6c.5-.9 5.1-.9 5.6.7.5 1.5-1.2 2-2.8 2.3s-3.3.5-2.7 1.7c.5.9 5.1.8 5.6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
  detail,
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
      {detail ? <p className="metric-detail">{detail}</p> : null}
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  );
}
