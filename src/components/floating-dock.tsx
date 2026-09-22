"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIconSvg } from "@/components/nav-icon";
import type { NavItem } from "@/lib/types";

type Props = {
  items: NavItem[];
};

function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/ventas") {
    return (
      pathname === "/ventas" ||
      (/^\/ventas\//.test(pathname) && !pathname.startsWith("/ventas/clientes"))
    );
  }
  if (href === "/clientes") {
    return pathname === "/clientes" || pathname.startsWith("/clientes/");
  }
  if (href === "/compras") {
    return pathname === "/compras" || pathname.startsWith("/compras/");
  }
  if (href === "/proveedores") {
    return (
      pathname === "/proveedores" ||
      (/^\/proveedores\//.test(pathname) &&
        !pathname.startsWith("/proveedores/compras"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FloatingDock({ items }: Props) {
  const pathname = usePathname() || "/";

  return (
    <nav className="bottom-nav floating-dock" aria-label="Navegación móvil">
      {items.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden>
              {item.icon ? <NavIconSvg name={item.icon} /> : null}
            </span>
            <span className="bottom-nav-label">
              {item.shortLabel ?? item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
