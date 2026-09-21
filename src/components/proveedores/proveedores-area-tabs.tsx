"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/proveedores", label: "Proveedores", exact: true },
  { href: "/proveedores/compras", label: "Compras", exact: false },
] as const;

export function ProveedoresAreaTabs() {
  const pathname = usePathname() || "/proveedores";

  return (
    <div className="tab-row area-tabs" role="tablist" aria-label="Área proveedores">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={`tab-btn ${active ? "is-active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
