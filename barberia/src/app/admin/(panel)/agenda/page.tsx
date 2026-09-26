import Link from "next/link";
import { prisma } from "@/lib/db";
import { addDays, isDate, zonedNow } from "@/lib/availability";
import { CITA_LABEL, PAGO_LABEL, formatLong, one } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { getSettings } from "@/lib/shop";
import { buttonClass, inputClass } from "@/lib/ui";

export const metadata = { title: "Agenda" };

export default async function AgendaPage(props: {
  searchParams: Promise<{ fecha?: string; barbero?: string; pago?: string }>;
}) {
  const [user, settings, params] = await Promise.all([requireUser(), getSettings(), props.searchParams]);
  const today = zonedNow(settings?.timezone ?? "America/La_Paz");
  const fechaParam = one(params.fecha);
  const fecha = fechaParam && isDate(fechaParam) ? fechaParam : today.date;
  const pago = one(params.pago) ?? "todos";
  const barbero = user.rol === "barbero" ? user.id : (one(params.barbero) ?? "todos");
  const barbers =
    user.rol === "admin"
      ? await prisma.user.findMany({ where: { rol: "barbero" }, orderBy: { nombre: "asc" } })
      : [];
  const appointments = await prisma.appointment.findMany({
    where: {
      fecha,
      ...(barbero !== "todos" ? { barberId: barbero } : {}),
      ...(pago !== "todos" ? { estadoPago: pago } : {}),
    },
    include: { client: true, barber: true, services: true },
    orderBy: { horaInicio: "asc" },
  });
  const prev = addDays(fecha, -1);
  const next = addDays(fecha, 1);
  const query = (day: string) => {
    const search = new URLSearchParams();
    search.set("fecha", day);
    if (barbero !== "todos" && user.rol === "admin") search.set("barbero", barbero);
    if (pago !== "todos") search.set("pago", pago);
    return `/admin/agenda?${search.toString()}`;
  };

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Agenda</h1>
      <Link href="/admin/agenda/nueva" className={buttonClass}>
        Agendar manualmente
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <Link href={query(prev)} className="flex h-12 items-center justify-center border border-ink bg-white text-sm">
          Día anterior
        </Link>
        <Link href={query(next)} className="flex h-12 items-center justify-center border border-ink bg-white text-sm">
          Día siguiente
        </Link>
      </div>
      <p className="text-lg">{formatLong(fecha)}</p>
      <form className="grid gap-2" action="/admin/agenda">
        <input className={inputClass} type="date" name="fecha" defaultValue={fecha} />
        {user.rol === "admin" ? (
          <select className={inputClass} name="barbero" defaultValue={barbero}>
            <option value="todos">Todos los barberos</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.nombre}
                {barber.activo ? "" : " (sin acceso)"}
              </option>
            ))}
          </select>
        ) : null}
        <select className={inputClass} name="pago" defaultValue={pago}>
          <option value="todos">Cualquier pago</option>
          <option value="pendiente">Por cobrar</option>
          <option value="comprobante_enviado">Comprobante por revisar</option>
          <option value="verificado">Pagado</option>
          <option value="rechazado">Pago rechazado</option>
        </select>
        <button className="h-12 border border-ink bg-white" type="submit">
          Ver este día
        </button>
      </form>
      {appointments.length === 0 ? <p>No hay citas en este día.</p> : null}
      <ul>
        {appointments.map((appointment) => (
          <li key={appointment.id} className="border-t border-[#d5e0da]">
            <Link href={`/admin/agenda/${appointment.id}`} className="grid min-h-16 grid-cols-[4.5rem_1fr] gap-2 py-3">
              <span className="text-lg">{appointment.horaInicio}</span>
              <span>
                <span className="block">
                  {appointment.client.nombre} {appointment.client.apellido}
                </span>
                <span className="block text-sm text-[#3e564c]">
                  {appointment.services.map((service) => service.nombre).join(", ")}
                  {user.rol === "admin" ? ` · ${appointment.barber.nombre}` : ""}
                </span>
                <span className="block text-sm">
                  {CITA_LABEL[appointment.estado]} · {PAGO_LABEL[appointment.estadoPago]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
