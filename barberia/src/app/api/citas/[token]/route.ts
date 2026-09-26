import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/shop";

function stamp(date: string, time: string): string {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function escapeText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const [appointment, settings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { publicToken: token },
      include: { services: true, barber: true },
    }),
    getSettings(),
  ]);
  if (!appointment || !settings) return new Response("No encontramos esa cita.", { status: 404 });
  const summary = appointment.services.map((service) => service.nombre).join(", ");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Casa Navarro//Citas//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${appointment.publicToken}@casanavarro`,
    `DTSTAMP:${stamp(appointment.fecha, appointment.horaInicio)}`,
    `DTSTART:${stamp(appointment.fecha, appointment.horaInicio)}`,
    `DTEND:${stamp(appointment.fecha, appointment.horaFin)}`,
    `SUMMARY:${escapeText(`Cita en ${settings.shopName}`)}`,
    `DESCRIPTION:${escapeText(`${summary} con ${appointment.barber.nombre}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cita.ics"',
    },
  });
}
