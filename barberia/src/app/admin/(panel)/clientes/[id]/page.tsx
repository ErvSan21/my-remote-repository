import Link from "next/link";
import { notFound } from "next/navigation";
import { giftCut } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { CITA_LABEL, formatLong } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { quietButtonClass } from "@/lib/ui";

export const metadata = { title: "Cliente" };

export default async function ClientePage(props: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([props.params, requireUser()]);
  const client = await prisma.client.findFirst({
    where: {
      id,
      ...(user.rol === "barbero" ? { appointments: { some: { barberId: user.id } } } : {}),
    },
    include: {
      appointments: {
        where: user.rol === "barbero" ? { barberId: user.id } : undefined,
        include: { services: true, barber: true },
        orderBy: [{ fecha: "desc" }, { horaInicio: "desc" }],
      },
    },
  });
  if (!client) notFound();
  const last = client.appointments[0];

  return (
    <div className="grid gap-4">
      <Link href="/admin/clientes">Volver a clientes</Link>
      <h1 className="font-display text-4xl leading-none">
        {client.nombre} {client.apellido}
      </h1>
      <p>{client.telefono}</p>
      {client.email ? <p>{client.email}</p> : null}
      <p>{client.visitasTotales} visitas</p>
      <p>{client.cortesGratisDisponibles} cortes gratis disponibles</p>
      <p>{last ? `Última cita: ${formatLong(last.fecha)}` : "Todavía no tiene citas en esta vista."}</p>
      {user.rol === "admin" ? (
        <form action={giftCut}>
          <input type="hidden" name="id" value={client.id} />
          <button className={quietButtonClass} type="submit">
            Obsequiar corte gratis
          </button>
        </form>
      ) : null}
      <h2 className="font-display text-2xl">Historial</h2>
      <ul>
        {client.appointments.map((appointment) => (
          <li key={appointment.id} className="border-t border-[#d5e0da]">
            <Link href={`/admin/agenda/${appointment.id}`} className="block py-3">
              <span className="block">
                {formatLong(appointment.fecha)} · {appointment.horaInicio}
              </span>
              <span className="block text-sm text-[#3e564c]">
                {appointment.services.map((service) => service.nombre).join(", ")} · {appointment.barber.nombre} · {CITA_LABEL[appointment.estado]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
