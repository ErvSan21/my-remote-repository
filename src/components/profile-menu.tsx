"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";

type ProfileMenuProps = {
  showUsers?: boolean;
};

export function ProfileMenu({ showUsers = false }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="profile-menu-button"
        aria-label="Cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle
            cx="12"
            cy="8"
            r="3.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M5.2 19.2c1.35-3.05 3.7-4.55 6.8-4.55s5.45 1.5 6.8 4.55"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="profile-menu-panel" id={menuId} role="menu">
          <Link
            href="/perfil"
            role="menuitem"
            className="profile-menu-item"
            onClick={() => setOpen(false)}
          >
            Perfil
          </Link>
          {showUsers ? (
            <Link
              href="/usuarios"
              role="menuitem"
              className="profile-menu-item profile-menu-users"
              onClick={() => setOpen(false)}
            >
              Usuarios
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className="profile-menu-item">
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
