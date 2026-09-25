import type { NavItem } from "@/lib/types";

/** Navegación principal: Dashboard, Ventas, Compras, Clientes, Proveedores. */
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
    label: "Ventas",
    shortLabel: "Ventas",
    icon: "cash",
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
  {
    href: "/clientes",
    label: "Clientes",
    shortLabel: "Clientes",
    icon: "clients",
    module: "clientes",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    shortLabel: "Proveedores",
    icon: "suppliers",
    module: "proveedores",
    roles: ["admin", "superadmin"],
  },
];
