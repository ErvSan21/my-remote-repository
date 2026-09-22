import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  showAdd?: boolean;
  trailing?: ReactNode;
  /** Full-width primary CTA under the title (mobile list screens). */
  addStyle?: "plus" | "button";
};

export function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel = "Crear",
  showAdd = true,
  trailing,
  addStyle = "plus",
}: PageHeaderProps) {
  const showButton = showAdd && onAdd && addStyle === "button";
  const showPlus = showAdd && onAdd && addStyle === "plus";

  return (
    <header className={`data-header providers-header${subtitle ? " has-subtitle" : ""}`}>
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
