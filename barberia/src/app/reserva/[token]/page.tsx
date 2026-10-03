import Link from "next/link";
import { notFound } from "next/navigation";
import { replaceReceipt } from "@/app/actions/public";
import { prisma } from "@/lib/db";
import { bolivianos, formatLong, PAGO_LABEL, waLink } from "@/lib/format";
import { getSettings } from "@/lib/shop";
import { buttonClass } from "@/lib/ui";

export const metadata = { title: "Tu cita" };

export default async function ReservaPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const [appointment, settings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { publicToken: token },
      include: { services: true, barber: true, client: true },
    }),
    getSettings(),
  ]);
  if (!appointment || !settings) notFound();
  const total = appointment.services.reduce((sum, service) => sum + service.precio, 0);

  return (
    <main className="min-h-dvh bg-foam text-ink">
      <header className="bg-ink text-foam">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/" className="font-display text-2xl leading-none">
            {settings.shopName}
          </Link>
          <a href={waLink(settings.whatsappNumber, settings.whatsappMessage)}>WhatsApp</a>
        </div>
      </header>
      <div className="mx-auto grid max-w-lg gap-4 px-4 py-6">
        <h1 className="font-display text-5xl leading-[0.9]">
          {appointment.estado === "cancelada" ? "Cita cancelada" : "Cita reservada"}
        </h1>
        <p className="text-lg">
          {formatLong(appointment.fecha)} a las {appointment.horaInicio}, con {appointment.barber.nombre}.
        </p>
        <p>
          {appointment.services.map((service) => service.nombre).join(", ")}. {bolivianos(total)}.
        </p>
        <p>{clientMessage(appointment.estado, appointment.estadoPago, appointment.metodoPago)}</p>
        <p className="text-sm text-[#3e564c]">{PAGO_LABEL[appointment.estadoPago]}</p>
        {appointment.estado !== "cancelada" ? (
          <a className="underline" href={`/api/citas/${appointment.publicToken}`}>
            Agregar a mi calendario
          </a>
        ) : null}
        {appointment.estadoPago === "rechazado" && appointment.estado !== "cancelada" ? (
          <form action={replaceReceipt} className="grid gap-3 border border-[#c5d5cc] bg-white p-3">
            <input type="hidden" name="token" value={appointment.publicToken} />
            <label className="grid gap-1 text-sm">
              Sube otro comprobante
              <input name="comprobante" type="file" accept="image/jpeg,image/png,image/webp" className="text-base" required />
            </label>
            <button className={buttonClass} type="submit">
              Enviar comprobante
            </button>
          </form>
        ) : null}
        <Link href="/">Volver al inicio</Link>
      </div>
    </main>
  );
}

function clientMessage(estado: string, pago: string, metodo: string): string {
  if (estado === "cancelada") return "Esta cita está cancelada. Puedes reservar otra hora.";
  if (estado === "completada") return "Esta cita ya se atendió.";
  if (metodo === "corte_gratis") return "Esta cita usa un corte gratis.";
  if (pago === "comprobante_enviado") return "Recibimos el comprobante. La barbería lo revisa antes de la cita.";
  if (pago === "verificado") return "El pago está confirmado.";
  if (pago === "rechazado") return "No pudimos aceptar el comprobante. Sube otro o paga en la barbería.";
  return "Tu hora quedó reservada. Pagas en la barbería.";
}
