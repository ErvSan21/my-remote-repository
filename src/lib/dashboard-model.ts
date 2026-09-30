import type {
  DashboardParty,
  DashboardPayment,
  DashboardPurchase,
  DashboardSale,
} from "@/lib/dashboard-data";
import { dayKeyLaPaz, todayLaPaz } from "@/lib/dates";
import { purchaseBalance } from "@/lib/debts";

export type PartyKind = "client" | "supplier";

export type PartyRef = { kind: PartyKind; id: string };

export type PartySummary = {
  id: string;
  kind: PartyKind;
  name: string;
  place: string | null;
  /** Ventas o compras con precio. */
  total: number;
  /** Cobrado o pagado. */
  paid: number;
  balance: number;
  birds: number;
  count: number;
  withoutPrice: number;
};

export type HistoryEntry = {
  key: string;
  /** "a" = venta/compra, "b" = cobro/pago. */
  group: "a" | "b";
  label: string;
  detail: string;
  at: string;
  by: string | null;
  amount: number | null;
};

export type ActivityEntry = {
  key: string;
  at: string;
  by: string | null;
  text: string;
  amount: number | null;
  tone: "sale" | "income" | "purchase" | "expense";
  party: PartyRef;
};

export type DayBucket = {
  key: string;
  label: string;
  longLabel: string;
  total: number;
  birds: number;
  count: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const picked = words.filter((w) => w.length > 2 || w === w.toUpperCase());
  const source = picked.length > 0 ? picked : words;
  return source
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function clientSummaries(
  clients: DashboardParty[],
  ventas: DashboardSale[],
): PartySummary[] {
  return clients.map((client) => {
    const sales = ventas.filter((v) => v.client_id === client.id);
    const total = sales.reduce((sum, v) => sum + Number(v.total_amount ?? 0), 0);
    // Mismo cálculo que el resto de la app: saldo de cada venta según sus cobros.
    const balance = sales.reduce((sum, v) => sum + v.pending_amount, 0);
    const paid = total - balance;
    return {
      id: client.id,
      kind: "client",
      name: client.name,
      place: client.place,
      total: round2(total),
      paid: round2(paid),
      balance: round2(balance),
      birds: sales.reduce((sum, v) => sum + v.quantity_birds, 0),
      count: sales.length,
      withoutPrice: sales.filter((v) => v.total_amount == null).length,
    };
  });
}

export function supplierSummaries(
  suppliers: DashboardParty[],
  purchases: DashboardPurchase[],
): PartySummary[] {
  return suppliers.map((supplier) => {
    const buys = purchases.filter((p) => p.supplier_id === supplier.id);
    const total = buys.reduce((sum, p) => sum + Number(p.total_amount ?? 0), 0);
    // Saldo de cada compra con precio según sus pagos.
    const balance = buys.reduce(
      (sum, p) => sum + (purchaseBalance(p.total_amount, p.paid_amount).pending_amount ?? 0),
      0,
    );
    const paid = total - balance;
    return {
      id: supplier.id,
      kind: "supplier",
      name: supplier.name,
      place: supplier.place,
      total: round2(total),
      paid: round2(paid),
      balance: round2(balance),
      birds: buys.reduce((sum, p) => sum + p.quantity_birds, 0),
      count: buys.length,
      withoutPrice: buys.filter((p) => p.total_amount == null).length,
    };
  });
}

/** Primero quien debe más; los que están al día al final. */
export function sortByBalance(list: PartySummary[]) {
  return [...list]
    .filter((p) => p.count > 0 || p.paid > 0)
    .sort((a, b) => b.balance - a.balance || b.withoutPrice - a.withoutPrice || a.name.localeCompare(b.name));
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  qr: "QR / Transferencia",
  on_delivery: "Contra entrega",
};

function birdsText(n: number) {
  return `${n.toLocaleString("es-BO")} ${n === 1 ? "pollo" : "pollos"}`;
}

function priceText(price: number | null) {
  if (price == null) return "precio pendiente";
  return `Bs ${price.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/u`;
}

export function partyHistory(
  ref: PartyRef,
  ventas: DashboardSale[],
  purchases: DashboardPurchase[],
  clientPayments: DashboardPayment[],
  supplierPayments: DashboardPayment[],
  people: Record<string, string>,
): HistoryEntry[] {
  const who = (id: string | null) => (id ? people[id] ?? null : null);
  const entries: HistoryEntry[] = [];

  if (ref.kind === "client") {
    ventas
      .filter((v) => v.client_id === ref.id)
      .forEach((v) =>
        entries.push({
          key: `v-${v.id}`,
          group: "a",
          label: "Venta",
          detail: `${birdsText(v.quantity_birds)} · ${priceText(v.unit_price)}`,
          at: v.created_at,
          by: who(v.created_by),
          amount: v.total_amount,
        }),
      );
    clientPayments
      .filter((p) => p.party_id === ref.id)
      .forEach((p, i) =>
        entries.push({
          key: `c-${i}-${p.paid_at}`,
          group: "b",
          label: "Cobro",
          detail: METHOD_LABEL[p.method] ?? p.method,
          at: p.paid_at,
          by: who(p.recorded_by),
          amount: p.amount,
        }),
      );
  } else {
    purchases
      .filter((p) => p.supplier_id === ref.id)
      .forEach((p) =>
        entries.push({
          key: `p-${p.id}`,
          group: "a",
          label: "Compra",
          detail: `${birdsText(p.quantity_birds)} · ${priceText(p.unit_price)}`,
          at: p.created_at || p.purchase_date,
          by: who(p.created_by),
          amount: p.total_amount,
        }),
      );
    supplierPayments
      .filter((p) => p.party_id === ref.id)
      .forEach((p, i) =>
        entries.push({
          key: `s-${i}-${p.paid_at}`,
          group: "b",
          label: "Pago",
          detail: METHOD_LABEL[p.method] ?? p.method,
          at: p.paid_at,
          by: who(p.recorded_by),
          amount: p.amount,
        }),
      );
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function recentActivity(
  ventas: DashboardSale[],
  purchases: DashboardPurchase[],
  clientPayments: DashboardPayment[],
  supplierPayments: DashboardPayment[],
  clients: DashboardParty[],
  suppliers: DashboardParty[],
  people: Record<string, string>,
  limit = 6,
): ActivityEntry[] {
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const who = (id: string | null) => (id ? people[id] ?? null : null);
  const all: ActivityEntry[] = [];

  ventas.forEach((v) =>
    all.push({
      key: `v-${v.id}`,
      at: v.created_at,
      by: who(v.created_by),
      text: `entregó ${birdsText(v.quantity_birds)} a${clientName.get(v.client_id) ?? "un cliente"}`,
      amount: v.total_amount,
      tone: "sale",
      party: { kind: "client", id: v.client_id },
    }),
  );
  clientPayments.forEach((p, i) =>
    all.push({
      key: `c-${i}-${p.paid_at}`,
      at: p.paid_at,
      by: who(p.recorded_by),
      text: `cobró ${bs0(p.amount)} a ${clientName.get(p.party_id) ?? "un cliente"}`,
      amount: p.amount,
      tone: "income",
      party: { kind: "client", id: p.party_id },
    }),
  );
  purchases.forEach((p) =>
    all.push({
      key: `p-${p.id}`,
      at: p.created_at || p.purchase_date,
      by: who(p.created_by),
      text: `registró compra de ${birdsText(p.quantity_birds)} a ${supplierName.get(p.supplier_id) ?? "un proveedor"}${p.total_amount == null ? " sin precio" : ""}`,
      amount: p.total_amount,
      tone: "purchase",
      party: { kind: "supplier", id: p.supplier_id },
    }),
  );
  supplierPayments.forEach((p, i) =>
    all.push({
      key: `s-${i}-${p.paid_at}`,
      at: p.paid_at,
      by: who(p.recorded_by),
      text: `pagó ${bs0(p.amount)} a ${supplierName.get(p.party_id) ?? "un proveedor"}`,
      amount: p.amount,
      tone: "expense",
      party: { kind: "supplier", id: p.party_id },
    }),
  );

  return all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
}

const WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Días del rango (máx. 31); con rangos más largos, agrupa por mes. */
export function salesBuckets(ventas: DashboardSale[], from: string, to: string): DayBucket[] {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const byMonth = days > 31;

  const buckets = new Map<string, DayBucket>();
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const key = byMonth ? iso.slice(0, 7) : iso;
    if (!buckets.has(key)) {
      const d = cursor.getUTCDate();
      const m = cursor.getUTCMonth();
      buckets.set(key, {
        key,
        label: byMonth ? MONTH[m] : days <= 7 ? WEEKDAY[cursor.getUTCDay()] : String(d),
        longLabel: byMonth
          ? `${MONTH_LONG[m]} ${cursor.getUTCFullYear()}`
          : `${WEEKDAY[cursor.getUTCDay()]} ${d} de ${MONTH_LONG[m]}`,
        total: 0,
        birds: 0,
        count: 0,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const v of ventas) {
    const day = dayKeyLaPaz(v.created_at);
    const bucket = buckets.get(byMonth ? day.slice(0, 7) : day);
    if (!bucket) continue;
    bucket.total = round2(bucket.total + Number(v.total_amount ?? 0));
    bucket.birds += v.quantity_birds;
    bucket.count += 1;
  }
  return [...buckets.values()];
}

/** "Hoy, 10:24", "Ayer, 18:10" o "28 sep, 10:24" (hora de La Paz). */
export function whenText(iso: string) {
  const day = dayKeyLaPaz(iso);
  if (!day) return "";
  const today = todayLaPaz();
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const time = iso.includes("T")
    ? new Date(iso).toLocaleTimeString("es-BO", {
        timeZone: "America/La_Paz",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";
  let dayText: string;
  if (day === today) dayText = "Hoy";
  else if (day === yesterday.toISOString().slice(0, 10)) dayText = "Ayer";
  else {
    const [, m, d] = day.split("-").map(Number);
    dayText = `${d} ${MONTH[m - 1]}`;
  }
  return time ? `${dayText}, ${time}` : dayText;
}

/** Bs sin decimales: Bs 86.450. */
export function bs0(n: number | null | undefined) {
  return `Bs ${Math.round(Number(n ?? 0)).toLocaleString("es-BO")}`;
}

/** Ventas del mes en curso contra el mismo tramo del mes anterior. */
export function monthCompare(ventas: DashboardSale[], today = todayLaPaz()) {
  const [y, m, d] = today.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const curPrefix = `${y}-${pad(m)}`;
  const prevPrefix = `${prevY}-${pad(prevM)}`;
  const prevUntil = `${prevPrefix}-${pad(d)}`;
  let current = 0;
  let previous = 0;
  for (const v of ventas) {
    const day = dayKeyLaPaz(v.created_at);
    const amount = Number(v.total_amount ?? 0);
    if (day.startsWith(curPrefix)) current += amount;
    else if (day.startsWith(prevPrefix) && day <= prevUntil) previous += amount;
  }
  const pct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  return { current: round2(current), previous: round2(previous), pct, prevMonth: MONTH_LONG[prevM - 1] };
}

/** Fecha larga de hoy: "Martes 29 de septiembre". */
export function todayLongText(today = todayLaPaz()) {
  const date = new Date(`${today}T12:00:00Z`);
  const weekday = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][date.getUTCDay()];
  return `${weekday} ${date.getUTCDate()} de ${MONTH_LONG[date.getUTCMonth()]}`;
}

/** Los 7 días que terminan hoy. */
export function lastWeekRange(today = todayLaPaz()) {
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  return { from: start.toISOString().slice(0, 10), to: today };
}

/** Montos cortos para el gráfico: 12,3k. */
export function compactBs(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString("es-BO", { maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("es-BO", { maximumFractionDigits: 0 });
}
