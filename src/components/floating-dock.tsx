"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIconSvg } from "@/components/nav-icon";
import { RegisterButton } from "@/components/register-button";
import { isActiveHref } from "@/lib/nav";
import type { NavItem } from "@/lib/types";

type Props = {
  items: NavItem[];
  isAdmin: boolean;
};

/** Barra inferior: dos accesos, el botón "+" al centro y el resto a la derecha. */
export function FloatingDock({ items, isAdmin }: Props) {
  const pathname = usePathname() || "/";
  const half = Math.ceil(items.length / 2);

  const link = (item: NavItem) => {
    const active = isActiveHref(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`bottom-nav-link${active ? " is-active" : ""}`}
        aria-current={active ? "page" : undefined}
        title={item.label}
      >
        <span className="bottom-nav-icon" aria-hidden>
          {item.icon ? <NavIconSvg name={item.icon} /> : null}
        </span>
        <span className="bottom-nav-label">{item.shortLabel ?? item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="bottom-nav floating-dock" aria-label="Navegación móvil">
      {items.slice(0, half).map(link)}
      <div className="bottom-nav-center">
        <RegisterButton isAdmin={isAdmin} variant="dock" />
      </div>
      {items.slice(half).map(link)}
    </nav>
  );
}
