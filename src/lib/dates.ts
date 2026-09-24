const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function todayLaPaz() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/La_Paz",
  });
}

/** Lunes a domingo de la semana que contiene `today` (calendario de La Paz). */
export function weekBoundsLaPaz(today = todayLaPaz()) {
  const [year, month, day] = today.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day));
  const weekday = anchor.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { from: iso(monday), to: iso(sunday) };
}

export function dayKeyLaPaz(iso: string | null | undefined) {
  if (!iso) return "";
  if (DATE_KEY.test(iso)) return iso;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
}

export function inDateRange(day: string, from: string, to: string) {
  return Boolean(day) && day >= from && day <= to;
}
