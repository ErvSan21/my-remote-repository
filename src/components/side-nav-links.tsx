"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIconSvg } from "@/components/nav-icon";
import { isActiveHref } from "@/lib/nav";
import type { NavItem } from "@/lib/types";

type Props = {
  items: NavItem[];
};

export function SideNavLinks({ items }: Props) {
  const pathname = usePathname() || "/";

  return (
    <nav className="side-nav-list">
      {items.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`side-nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.icon ? <NavIconSvg name={item.icon} /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
