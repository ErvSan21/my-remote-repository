import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  showAdd?: boolean;
  trailing?: ReactNode;
  onSearchToggle?: () => void;
  searchOpen?: boolean;
  /** Full-width primary CTA under the title (mobile list screens). */
  addStyle?: "plus" | "button";
  /** Navy hero banner matching MAC mockups. */
  variant?: "default" | "hero";
};

export function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel = "Crear",
  showAdd = true,
  trailing,
  onSearchToggle,
  searchOpen = false,
  addStyle = "plus",
  variant = "default",
}: PageHeaderProps) {
  const showButton = showAdd && onAdd && addStyle === "button";
  const showPlus = showAdd && onAdd && addStyle === "plus";
  const showActions = showButton || showPlus || Boolean(onSearchToggle);

  if (variant === "hero") {
    return (
      <header className="module-hero">
        <div className="module-hero-top">
          <h1 className="module-hero-title">{title}</h1>
          {trailing}
        </div>
        {subtitle ? <p className="module-hero-sub">{subtitle}</p> : null}
        {showActions ? (
        <div className="module-hero-actions">
          {showButton ? (
            <button
              type="button"
              className="btn-primary module-hero-cta"
              onClick={onAdd}
            >
              {addLabel}
            </button>
          ) : null}
          {showPlus ? (
            <button
              type="button"
              className="btn-plus"
              aria-label={addLabel}
              title={addLabel}
              onClick={onAdd}
            >
              +
            </button>
          ) : null}
          {onSearchToggle ? (
            <button
              type="button"
              className={`module-hero-search${searchOpen ? " is-active" : ""}`}
              aria-label={searchOpen ? "Ocultar búsqueda" : "Buscar"}
              aria-expanded={searchOpen}
              aria-controls="list-filters"
              onClick={onSearchToggle}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          ) : null}
        </div>
        ) : null}
      </header>
    );
  }

  return (
    <header
      className={`data-header providers-header${subtitle ? " has-subtitle" : ""}`}
    >
      <div className="page-header-text">
        <h2 className="module-title">{title}</h2>
        {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
      </div>
      {trailing}
      {showPlus ? (
        <button
          type="button"
          className="btn-plus"
          aria-label={addLabel}
          title={addLabel}
          onClick={onAdd}
        >
          +
        </button>
      ) : null}
      {showButton ? (
        <button
          type="button"
          className="btn-primary btn-form page-header-cta"
          onClick={onAdd}
        >
          + {addLabel}
        </button>
      ) : null}
    </header>
  );
}
