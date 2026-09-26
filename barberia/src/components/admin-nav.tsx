"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/mas", label: "Más" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d5e0da] bg-sheet pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((item) => {
          const on = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-16 items-center justify-center text-sm ${on ? "text-ink" : "text-[#6d857b]"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
