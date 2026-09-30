"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Hoja inferior (en escritorio, ventana centrada) con el estilo de "Registrar". */
export function Sheet({ title, subtitle, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Solo se monta al abrirla desde el navegador, así que document existe.
  return createPortal(
    <div className="rs-root">
      <button type="button" className="rs-backdrop" aria-label="Cerrar" onClick={onClose} />
      <section className="rs-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <span className="rs-grip" aria-hidden />
        <div className="rs-head">
          <div className="rs-head-text">
            <h2 id="sheet-title" className="gp-num rs-title">
              {title}
            </h2>
            {subtitle ? <p className="rs-subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="rs-icon-btn" aria-label="Cerrar" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
