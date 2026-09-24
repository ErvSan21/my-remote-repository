import type { ReactNode } from "react";
import { BackArrowIcon } from "@/components/ui/back-arrow-icon";

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
  /** Replaces the title row with the navy back control. */
  onBack?: () => void;
};

export function PageHeader({
  title,
  subtitle,
  onAdd,
  addLabel = "Crear",
  showAdd = true,
  trailing,
  addStyle = "plus",
  variant = "default",
  onBack,
}: PageHeaderProps) {
  const showButton = showAdd && onAdd && addStyle === "button";
  const showPlus = showAdd && onAdd && (addStyle === "plus" || variant === "hero");

  if (variant === "hero") {
    return (
      <header className="module-hero">
        {onBack ? (
          <button type="button" className="module-hero-back" onClick={onBack}>
            <BackArrowIcon />
            {title}
          </button>
        ) : (
          <>
            <div className="module-hero-top">
              <h1 className="module-hero-title">{title}</h1>
              {trailing}
              {showPlus ? (
                <button
                  type="button"
                  className="btn-plus is-round"
                  aria-label={addLabel}
                  title={addLabel}
                  onClick={onAdd}
                >
                  +
                </button>
              ) : null}
            </div>
            {subtitle ? <p className="module-hero-sub">{subtitle}</p> : null}
          </>
        )}
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
