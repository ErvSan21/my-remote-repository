"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/ventas", label: "Ventas", exact: true },
  { href: "/ventas/clientes", label: "Clientes", exact: false },
] as const;

type Props = {
  showClientesTab?: boolean;
};

export function VentasAreaTabs({ showClientesTab = true }: Props) {
  const pathname = usePathname() || "/ventas";
  const tabs = showClientesTab
    ? TABS
    : TABS.filter((t) => t.href === "/ventas");

  if (tabs.length < 2) return null;

  return (
    <div className="tab-row area-tabs" role="tablist" aria-label="Área ventas">
      {tabs.map((tab) => {
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
