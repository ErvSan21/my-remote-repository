import Link from "next/link";
import { notFound } from "next/navigation";
import { setEstado, setPago } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { bolivianos, CITA_LABEL, formatLong, mediaSrc, METODO_LABEL, one, PAGO_LABEL } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { buttonClass, quietButtonClass } from "@/lib/ui";

export const metadata = { title: "Cita" };

export default async function CitaPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, searchParams, user] = await Promise.all([props.params, props.searchParams, requireUser()]);
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { client: true, barber: true, services: true },
  });
  if (!appointment) notFound();
  if (user.rol === "barbero" && appointment.barberId !== user.id) notFound();
  const total = appointment.services.reduce((sum, service) => sum + service.precio, 0);
  const error = one(searchParams.error);
  const receipt = mediaSrc(appointment.comprobanteUrl);

  return (
    <div className="grid gap-4">
      <Link href="/admin/agenda">Volver a la agenda</Link>
      <h1 className="font-display text-4xl leading-none">
        {appointment.client.nombre} {appointment.client.apellido}
      </h1>
      <p>
        {formatLong(appointment.fecha)} · {appointment.horaInicio} a {appointment.horaFin}
      </p>
      <p>Barbero: {appointment.barber.nombre}</p>
      <p>{appointment.services.map((service) => `${service.nombre} (${service.duracionMin} min)`).join(", ")}</p>
      <p>{bolivianos(total)}</p>
      <p>
        {CITA_LABEL[appointment.estado]} · {METODO_LABEL[appointment.metodoPago]} · {PAGO_LABEL[appointment.estadoPago]}
      </p>
      <p>Teléfono {appointment.client.telefono}</p>
      {appointment.notas ? <p>Nota: {appointment.notas}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      ) : null}
      {receipt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={receipt} alt="Comprobante de pago" className="w-full bg-white object-contain" />
      ) : null}
      {appointment.estado !== "completada" && appointment.estado !== "cancelada" ? (
        <div className="grid gap-2">
          <form action={setEstado}>
            <input type="hidden" name="id" value={appointment.id} />
            <input type="hidden" name="estado" value="completada" />
            <button className={buttonClass} type="submit">
              Marcar como completada
            </button>
          </form>
          <form action={setEstado}>
            <input type="hidden" name="id" value={appointment.id} />
            <input type="hidden" name="estado" value="cancelada" />
            <button className={quietButtonClass} type="submit">
              Cancelar cita
            </button>
          </form>
        </div>
      ) : null}
      {appointment.estadoPago === "comprobante_enviado" ? (
        <div className="grid gap-2">
          <form action={setPago}>
            <input type="hidden" name="id" value={appointment.id} />
            <input type="hidden" name="estadoPago" value="verificado" />
            <button className={buttonClass} type="submit">
              Marcar pago verificado
            </button>
          </form>
          <form action={setPago}>
            <input type="hidden" name="id" value={appointment.id} />
            <input type="hidden" name="estadoPago" value="rechazado" />
            <button className={quietButtonClass} type="submit">
              Rechazar comprobante
            </button>
          </form>
        </div>
      ) : null}
      {appointment.estadoPago === "rechazado" ? (
        <form action={setPago}>
          <input type="hidden" name="id" value={appointment.id} />
          <input type="hidden" name="estadoPago" value="en_local" />
          <button className={quietButtonClass} type="submit">
            Pasar a pago en la barbería
          </button>
        </form>
      ) : null}
      <Link href={`/admin/clientes/${appointment.clientId}`}>Ver ficha del cliente</Link>
    </div>
  );
}
