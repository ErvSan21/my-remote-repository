export function formatBs(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `Bs ${Number(amount).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Monto solo dígitos (sin “Bs”), es-BO. */
export function formatAmountPlain(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return Number(amount).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateLaPaz(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  // date-only strings: show as-is in DD/MM/YYYY-ish via es-BO
  const d = isoDate.includes("T") ? new Date(isoDate) : new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeLaPaz(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const BOLIVIA_DEPARTMENTS = [
  "La Paz",
  "Cochabamba",
  "Santa Cruz",
  "Oruro",
  "Potosí",
  "Tarija",
  "Chuquisaca",
  "Beni",
  "Pando",
] as const;

export type BoliviaDepartment = (typeof BOLIVIA_DEPARTMENTS)[number];

/** @deprecated Use BOLIVIA_DEPARTMENTS */
export const SUPPLIER_LOCATIONS = BOLIVIA_DEPARTMENTS;
export type SupplierLocation = BoliviaDepartment;

export const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending_price: "Precio pendiente",
  priced: "Con precio",
  partially_paid: "Pago parcial",
  paid: "Pagada",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  qr: "QR",
  on_delivery: "Al entregar",
};

export const CLIENT_ZONES = ["La Paz", "El Alto", "Otro"] as const;

export const CONSIGNMENT_STATUS_LABEL: Record<string, string> = {
  open: "Abierta",
  partial: "Pago parcial",
  closed: "Cerrada",
};

export const INVENTORY_REASON_LABEL: Record<string, string> = {
  purchase_in: "Entrada compra",
  slaughter_adjust: "Ajuste faena",
  consignment_out: "Salida consignación",
  sale_out: "Salida venta",
  adjustment: "Ajuste",
};
