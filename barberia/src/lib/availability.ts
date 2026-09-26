export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type HoursMap = Record<Weekday, [string, string] | null>;

export type Range = { start: number; end: number };

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

export const DEFAULT_HOURS: HoursMap = {
  mon: null,
  tue: ["09:00", "19:00"],
  wed: ["09:00", "19:00"],
  thu: ["09:00", "19:00"],
  fri: ["09:00", "19:00"],
  sat: ["09:00", "18:00"],
  sun: ["10:00", "14:00"],
};

const WEEKDAY_FROM_SHORT: Record<string, Weekday> = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

export function parseHours(json: string): HoursMap {
  const hours: HoursMap = { ...DEFAULT_HOURS };
  try {
    const raw = JSON.parse(json) as Partial<Record<Weekday, [string, string] | null>>;
    for (const day of WEEKDAYS) {
      const value = raw[day];
      if (value === null) hours[day] = null;
      else if (Array.isArray(value) && value.length === 2 && isTime(value[0]) && isTime(value[1])) {
        hours[day] = [value[0], value[1]];
      }
    }
  } catch {
    return { ...DEFAULT_HOURS };
  }
  return hours;
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function toMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function fromMinutes(total: number): string {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function endTime(start: string, durationMin: number): string {
  return fromMinutes(toMinutes(start) + durationMin);
}

export function weekdayOf(date: string): Weekday {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][utc.getUTCDay()] as Weekday;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function zonedNow(timeZone: string, now = new Date()): { date: string; minutes: number; weekday: Weekday } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: WEEKDAY_FROM_SHORT[parts.weekday] ?? "mon",
  };
}

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

type BlockLike = {
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string | null;
  horaFin: string | null;
};

export function busyFromBlocks(blocks: BlockLike[], date: string): { closed: boolean; ranges: Range[] } {
  let closed = false;
  const ranges: Range[] = [];
  for (const block of blocks) {
    if (date < block.fechaInicio || date > block.fechaFin) continue;
    if (!block.horaInicio || !block.horaFin) {
      closed = true;
      continue;
    }
    ranges.push({ start: toMinutes(block.horaInicio), end: toMinutes(block.horaFin) });
  }
  return { closed, ranges };
}

export function availableSlots(input: {
  open: [string, string] | null;
  durationMin: number;
  slotMinutes: number;
  busy: Range[];
  closed: boolean;
  nowMinutes: number | null;
}): string[] {
  if (input.closed || !input.open || input.durationMin <= 0 || input.slotMinutes <= 0) return [];
  const open = toMinutes(input.open[0]);
  const close = toMinutes(input.open[1]);
  const slots: string[] = [];
  for (let start = open; start + input.durationMin <= close; start += input.slotMinutes) {
    if (input.nowMinutes != null && start + input.slotMinutes <= input.nowMinutes) continue;
    const end = start + input.durationMin;
    const hits = input.busy.some((range) => start < range.end && range.start < end);
    if (!hits) slots.push(fromMinutes(start));
  }
  return slots;
}

export function chooseBarber(
  options: { id: string; slots: string[]; load: number }[],
  hora: string,
): string | null {
  const free = options.filter((option) => option.slots.includes(hora));
  free.sort((a, b) => a.load - b.load || a.id.localeCompare(b.id));
  return free[0]?.id ?? null;
}
