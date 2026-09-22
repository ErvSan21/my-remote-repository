import type { NavItem } from "@/lib/types";

/** Navegación principal: Dashboard, Ventas, Compras, Clientes, Proveedores. */
export const APP_NAV: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    shortLabel: "Inicio",
    icon: "home",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/ventas",
    label: "Ventas",
    shortLabel: "Ventas",
    icon: "cash",
    roles: ["vendedora", "admin", "superadmin"],
  },
  {
    href: "/compras",
    label: "Compras",
    shortLabel: "Compras",
    icon: "purchases",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/clientes",
    label: "Clientes",
    shortLabel: "Clientes",
    icon: "clients",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    shortLabel: "Proveed.",
    icon: "suppliers",
    roles: ["admin", "superadmin"],
  },
];
