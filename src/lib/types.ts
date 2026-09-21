export type AppRole = "vendedora" | "admin" | "superadmin";

export type PaymentMethod = "cash" | "qr" | "on_delivery";

export type PurchaseStatus =
  | "pending_price"
  | "priced"
  | "partially_paid"
  | "paid";

export type ConsignmentStatus = "open" | "partial" | "closed";

export type NavItem = {
  href: string;
  label: string;
  /** Roles that can see this nav item. Empty = all authenticated. */
  roles?: AppRole[];
  shortLabel?: string;
};
