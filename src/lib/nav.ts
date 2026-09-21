import type { NavItem } from "@/lib/types";

/** Navegación principal (admin+). Vendedora usará subset en runtime. */
export const APP_NAV: NavItem[] = [
  { href: "/", label: "Inicio", shortLabel: "Inicio" },
  { href: "/proveedores", label: "Proveedores", shortLabel: "Proveed." },
  { href: "/compras", label: "Compras", shortLabel: "Compras" },
  { href: "/pagos", label: "Pagos", shortLabel: "Pagos" },
  { href: "/clientes", label: "Clientes / Consignación", shortLabel: "Clientes" },
  { href: "/inventario", label: "Inventario", shortLabel: "Stock" },
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
