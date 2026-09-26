"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const primary = [
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/clientes", label: "Clientes" },
];

const moreAdmin = [
  { href: "/admin/bloqueos", label: "Bloqueos" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/barberos", label: "Barberos" },
  { href: "/admin/configuracion", label: "Configuración" },
  { href: "/admin/perfil", label: "Calendario" },
];

const moreBarber = [
  { href: "/admin/bloqueos", label: "Bloqueos" },
  { href: "/admin/perfil", label: "Calendario" },
];

function isOn(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  role,
  nombre,
  shop,
  children,
}: {
  role: string;
  nombre: string;
  shop: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = [...primary, ...(role === "admin" ? moreAdmin : moreBarber)];

  return (
    <div className="min-h-dvh bg-sheet text-ink md:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink text-foam md:flex">
        <div className="px-5 pt-8">
          <p className="font-display text-3xl leading-none">{shop}</p>
          <p className="mt-3 text-sm text-mist">{nombre}</p>
        </div>
        <nav className="mt-8 grid gap-1 px-3" aria-label="Panel">
          {links.map((item) => {
            const on = isOn(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-11 items-center px-3 text-sm transition-colors duration-150 ease-[ease] ${on ? "bg-white/10 text-foam" : "text-mist"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout} className="mt-auto p-3">
          <button className="press h-11 w-full px-3 text-left text-sm text-mist" type="submit">
            Salir
          </button>
        </form>
      </aside>

      <header className="flex items-end justify-between px-4 pt-5 md:hidden">
        <p className="font-display text-3xl leading-none">{shop}</p>
        <p className="text-sm">{nombre}</p>
      </header>
      <div className="px-4 pt-4 pb-28 md:px-10 md:pt-8 md:pb-12">
        <div className="mx-auto max-w-lg md:mx-0 md:max-w-5xl">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d5e0da] bg-sheet/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Panel">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {[...primary, { href: "/admin/mas", label: "Más" }].map((item) => {
            const on = isOn(pathname, item.href);
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
    </div>
  );
}
