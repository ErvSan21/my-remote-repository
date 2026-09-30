"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RegisterSheet } from "@/components/register-sheet";

type Props = {
  isAdmin: boolean;
  /** "dock": botón redondo del centro de la barra inferior. "side": botón del menú lateral. */
  variant: "dock" | "side";
};

/** Botón "+" que abre la hoja de registro y muestra el aviso al guardar. */
export function RegisterButton({ isAdmin, variant }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const done = useCallback((message: string) => {
    setOpen(false);
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {variant === "dock" ? (
        <button type="button" className="dock-plus" aria-label="Registrar" onClick={() => setOpen(true)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : (
        <button type="button" className="side-register" onClick={() => setOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Registrar
        </button>
      )}

      {/* Portal: la barra inferior usa transform y atraparía los elementos fijos. */}
      {open ? createPortal(<RegisterSheet isAdmin={isAdmin} onClose={close} onDone={done} />, document.body) : null}

      {toast ? createPortal(
        <div className="rs-toast" role="status" aria-live="polite">
          <span className="rs-toast-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </span>
          <span className="rs-toast-text">{toast}</span>
          <button type="button" className="rs-toast-close" aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
