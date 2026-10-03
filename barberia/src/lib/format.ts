import { addDays } from "@/lib/availability";

export function bolivianos(amount: number): string {
  return `Bs ${new Intl.NumberFormat("es-BO").format(amount)}`;
}

export function formatLong(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatWhen(date: string, today: string): string {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  return formatLong(date);
}

export function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function waLink(number: string, message: string): string {
  return `https://wa.me/${digits(number)}?text=${encodeURIComponent(message)}`;
}

export function mediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  return `/api/archivo/${url}`;
}

export function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export const PAGO_LABEL: Record<string, string> = {
  pendiente: "Por cobrar",
  comprobante_enviado: "Comprobante por revisar",
  verificado: "Pagado",
  rechazado: "Pago rechazado",
};

export const CITA_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const METODO_LABEL: Record<string, string> = {
  qr: "QR",
  en_local: "En la barbería",
  corte_gratis: "Corte gratis",
};
