import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  showAdd?: boolean;
  trailing?: ReactNode;
};

export function PageHeader({
  title,
  onAdd,
  addLabel = "Crear",
  showAdd = true,
  trailing,
}: PageHeaderProps) {
  return (
    <header className="data-header providers-header">
      <h2 className="module-title">{title}</h2>
      {trailing}
      {showAdd && onAdd ? (
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
    </header>
  );
}
