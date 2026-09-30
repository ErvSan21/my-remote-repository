import type { NavItem } from "@/lib/types";

/**
 * Navegación principal: Inicio, Clientes (ventas y cobros) y Compras (proveedores y pagos).
 * Las pantallas /clientes y /proveedores siguen existiendo, pero ya no van en el menú.
 */
export const APP_NAV: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    shortLabel: "Inicio",
    icon: "home",
    module: "inicio",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/ventas",
    label: "Clientes",
    shortLabel: "Clientes",
    icon: "clients",
    module: "ventas",
    roles: ["vendedora", "admin", "superadmin"],
  },
  {
    href: "/compras",
    label: "Compras",
    shortLabel: "Compras",
    icon: "purchases",
    module: "compras",
    roles: ["admin", "superadmin"],
  },
];

/** Acceso a Perfil en la barra inferior del celular. */
export const PERFIL_NAV: NavItem = {
  href: "/perfil",
  label: "Perfil",
  shortLabel: "Perfil",
  icon: "users",
};

/** Qué pestaña queda marcada para cada ruta. */
export function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/ventas") {
    return (
      pathname === "/ventas" ||
      pathname.startsWith("/ventas/") ||
      pathname === "/clientes" ||
      pathname.startsWith("/clientes/") ||
      pathname.startsWith("/recibos/")
    );
  }
  if (href === "/compras") {
    return (
      pathname === "/compras" ||
      pathname.startsWith("/compras/") ||
      pathname === "/proveedores" ||
      pathname.startsWith("/proveedores/") ||
      pathname.startsWith("/pagos-proveedores")
    );
  }
  if (href === "/perfil") return pathname.startsWith("/perfil") || pathname.startsWith("/usuarios");
  return pathname === href || pathname.startsWith(`${href}/`);
}
