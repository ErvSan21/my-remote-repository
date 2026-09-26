import {
  addDays,
  availableSlots,
  busyFromBlocks,
  toMinutes,
  weekdayOf,
  type HoursMap,
} from "@/lib/availability";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/shop";

type Opening = { fecha: string; hora: string; barber: string };

export async function openingFor(input: {
  fecha: string;
  durationMin: number;
  barberIds: string[];
  hours: HoursMap;
  slotMinutes: number;
  timezone: string;
  today: { date: string; minutes: number };
}): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (input.barberIds.length === 0) return result;
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        fecha: input.fecha,
        barberId: { in: input.barberIds },
        estado: { not: "cancelada" },
      },
    }),
    prisma.block.findMany({
      where: {
        barberId: { in: input.barberIds },
        fechaInicio: { lte: input.fecha },
        fechaFin: { gte: input.fecha },
      },
    }),
  ]);
  const open = input.hours[weekdayOf(input.fecha)];
  const nowMinutes = input.fecha === input.today.date ? input.today.minutes : null;
  for (const barberId of input.barberIds) {
    const busy = appointments
      .filter((item) => item.barberId === barberId)
      .map((item) => ({ start: toMinutes(item.horaInicio), end: toMinutes(item.horaFin) }));
    const blocked = busyFromBlocks(
      blocks.filter((item) => item.barberId === barberId),
      input.fecha,
    );
    result.set(
      barberId,
      availableSlots({
        open,
        durationMin: input.durationMin,
        slotMinutes: input.slotMinutes,
        busy: [...busy, ...blocked.ranges],
        closed: blocked.closed,
        nowMinutes,
      }),
    );
  }
  return result;
}

export async function nextOpening(): Promise<Opening | null> {
  const settings = await getSettings();
  if (!settings) return null;
  const services = await prisma.service.findMany({ where: { activo: true } });
  const barbers = await prisma.user.findMany({
    where: { rol: "barbero", activo: true },
    orderBy: { nombre: "asc" },
  });
  if (services.length === 0 || barbers.length === 0) return null;
  const duration = Math.min(...services.map((service) => service.duracionMin));
  const { zonedNow } = await import("@/lib/availability");
  const today = zonedNow(settings.timezone);
  const end = addDays(today.date, 14);
  const ids = barbers.map((barber) => barber.id);
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: { fecha: { gte: today.date, lte: end }, barberId: { in: ids }, estado: { not: "cancelada" } },
    }),
    prisma.block.findMany({
      where: { barberId: { in: ids }, fechaInicio: { lte: end }, fechaFin: { gte: today.date } },
    }),
  ]);
  for (let offset = 0; offset < 14; offset += 1) {
    const fecha = addDays(today.date, offset);
    let best: Opening | null = null;
    for (const barber of barbers) {
      const busy = appointments
        .filter((item) => item.barberId === barber.id && item.fecha === fecha)
        .map((item) => ({ start: toMinutes(item.horaInicio), end: toMinutes(item.horaFin) }));
      const blocked = busyFromBlocks(
        blocks.filter((item) => item.barberId === barber.id),
        fecha,
      );
      const slots = availableSlots({
        open: settings.hours[weekdayOf(fecha)],
        durationMin: duration,
        slotMinutes: settings.slotMinutes,
        busy: [...busy, ...blocked.ranges],
        closed: blocked.closed,
        nowMinutes: fecha === today.date ? today.minutes : null,
      });
      const hora = slots[0];
      if (hora && (!best || hora < best.hora)) best = { fecha, hora, barber: barber.nombre };
    }
    if (best) return best;
  }
  return null;
}

export async function firstOpenDate(hours: HoursMap, timezone: string): Promise<string> {
  const { zonedNow } = await import("@/lib/availability");
  const today = zonedNow(timezone);
  for (let offset = 0; offset < 14; offset += 1) {
    const fecha = addDays(today.date, offset);
    if (hours[weekdayOf(fecha)]) return fecha;
  }
  return today.date;
}
