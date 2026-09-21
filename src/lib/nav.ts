import type { NavItem } from "@/lib/types";

/** Navegación base; el filtrado por rol ocurre en navForRole(). */
export const APP_NAV: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    shortLabel: "Inicio",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    shortLabel: "Proveed.",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/compras",
    label: "Compras",
    shortLabel: "Compras",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/pagos-proveedores",
    label: "Pagos proveedores",
    shortLabel: "P.Prov",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/pagos",
    label: "Pagos clientes",
    shortLabel: "Cobros",
    roles: ["vendedora", "admin", "superadmin"],
  },
  {
    href: "/clientes",
    label: "Clientes / Consignación",
    shortLabel: "Clientes",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/inventario",
    label: "Inventario",
    shortLabel: "Stock",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/cierres",
    label: "Cierres / PDF",
    shortLabel: "Cierres",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    shortLabel: "Users",
    roles: ["superadmin"],
  },
];
