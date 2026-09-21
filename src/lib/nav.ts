import type { NavItem } from "@/lib/types";

/** Navegación base; el filtrado por rol ocurre en navForRole(). */
export const APP_NAV: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    shortLabel: "Inicio",
    icon: "home",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    shortLabel: "Proveed.",
    icon: "suppliers",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/compras",
    label: "Compras",
    shortLabel: "Compras",
    icon: "purchases",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/pagos-proveedores",
    label: "Pagos proveedores",
    shortLabel: "P.Prov",
    icon: "payments",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/pagos",
    label: "Cobros",
    shortLabel: "Cobros",
    icon: "cash",
    roles: ["vendedora", "admin", "superadmin"],
  },
  {
    href: "/clientes",
    label: "Clientes",
    shortLabel: "Clientes",
    icon: "clients",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/inventario",
    label: "Inventario",
    shortLabel: "Inventario",
    icon: "inventory",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/cierres",
    label: "Cierres / PDF",
    shortLabel: "Cierres",
    icon: "closures",
    roles: ["admin", "superadmin"],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    shortLabel: "Users",
    icon: "users",
    roles: ["superadmin"],
  },
];
