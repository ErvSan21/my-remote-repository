const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const TEXT_MAX = 2000;
export const MONEY_MAX = 1_000_000;
export const QTY_MAX = 1_000_000;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseMoney(value: unknown): number | null {
  return parseBoundedNumber(value, { min: 0.01 });
}

export function parseNonNegativeMoney(value: unknown): number | null {
  return parseBoundedNumber(value, { min: 0 });
}

function parseBoundedNumber(
  value: unknown,
  bounds: { min: number },
): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < bounds.min || amount > MONEY_MAX) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

export function parsePositiveInt(value: unknown, max = QTY_MAX): number | null {
  const qty = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(qty) || qty <= 0 || qty > max) return null;
  return qty;
}

/** Celular de Bolivia: solo dígitos, hasta 8. */
export const PHONE_MAX_DIGITS = 8;

export function phoneDigits(value: string, max = PHONE_MAX_DIGITS): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export function parsePhone(
  value: unknown,
  max = PHONE_MAX_DIGITS,
): { ok: true; value: string } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: "" };
  if (typeof value !== "string") {
    return { ok: false, message: "El celular solo admite números." };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: "" };
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: "El celular solo admite números." };
  }
  if (trimmed.length > max) {
    return { ok: false, message: "El celular admite hasta 8 números." };
  }
  return { ok: true, value: trimmed };
}

export function boundedText(
  value: unknown,
  max = TEXT_MAX,
): { ok: true; value: string } | { ok: false } {
  if (value == null) return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (trimmed.length > max) return { ok: false };
  return { ok: true, value: trimmed };
}
