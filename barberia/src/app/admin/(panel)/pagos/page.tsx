import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatLong, PAGO_LABEL } from "@/lib/format";
import { requireUser } from "@/lib/guards";

export const metadata = { title: "Pagos" };

export default async function PagosPage() {
  const user = await requireUser();
  const appointments = await prisma.appointment.findMany({
    where: {
      estadoPago: { in: ["comprobante_enviado", "rechazado"] },
      estado: { not: "cancelada" },
      ...(user.rol === "barbero" ? { barberId: user.id } : {}),
    },
    include: { client: true, services: true },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
  });

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Pagos</h1>
      <p className="text-sm text-[#3e564c]">Comprobantes que todavía hay que revisar.</p>
      {appointments.length === 0 ? <p>No hay comprobantes pendientes.</p> : null}
      <ul>
        {appointments.map((appointment) => (
          <li key={appointment.id} className="border-t border-[#d5e0da]">
            <Link href={`/admin/agenda/${appointment.id}`} className="block min-h-16 py-3">
              <span className="block">
                {appointment.client.nombre} {appointment.client.apellido}
              </span>
              <span className="block text-sm text-[#3e564c]">
                {formatLong(appointment.fecha)} · {appointment.horaInicio} · {appointment.services.map((service) => service.nombre).join(", ")}
              </span>
              <span className="block text-sm">{PAGO_LABEL[appointment.estadoPago]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
