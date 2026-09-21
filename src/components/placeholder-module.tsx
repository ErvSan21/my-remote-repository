type PlaceholderModuleProps = {
  title: string;
  description: string;
  bullets?: string[];
};

export function PlaceholderModule({
  title,
  description,
  bullets = [],
}: PlaceholderModuleProps) {
  return (
    <section className="module-panel">
      <h2 className="module-title">{title}</h2>
      <p className="module-desc">{description}</p>
      {bullets.length > 0 ? (
        <ul className="module-list">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      <p className="module-note">
        Módulo en construcción — datos reales tras conectar Supabase.
      </p>
    </section>
  );
}
