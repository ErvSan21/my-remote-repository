type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "orange" | "blue";
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "blue",
}: MetricCardProps) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-icon" aria-hidden>
        <span />
      </div>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  );
}
