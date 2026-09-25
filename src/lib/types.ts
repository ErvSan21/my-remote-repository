export type AppRole = "vendedora" | "admin" | "superadmin";

export type PaymentMethod = "cash" | "qr" | "on_delivery";

export type PurchaseStatus =
  | "pending_price"
  | "priced"
  | "partially_paid"
  | "paid";

export type ConsignmentStatus = "open" | "partial" | "closed";

export type NavIcon =
  | "home"
  | "suppliers"
  | "purchases"
  | "payments"
  | "clients"
  | "inventory"
  | "closures"
  | "users"
  | "cash";

export type NavItem = {
  href: string;
  label: string;
  /** Roles that can see this nav item. Empty = all authenticated. */
  roles?: AppRole[];
  /** Módulo que debe estar habilitado para ver este ítem. */
  module?: "inicio" | "ventas" | "compras" | "clientes" | "proveedores";
  shortLabel?: string;
  icon?: NavIcon;
};
