import Link from "next/link";
import { BookingWizard } from "@/components/booking-wizard";
import { prisma } from "@/lib/db";
import { mediaSrc, waLink } from "@/lib/format";
import { getSettings } from "@/lib/shop";
import { firstOpenDate } from "@/lib/slots";

export const metadata = { title: "Reservar cita" };

export default async function ReservarPage() {
  const settings = await getSettings();
  if (!settings) {
    return <main className="px-5 py-10">Falta preparar la base de datos.</main>;
  }
  const [services, barbers, initialDate] = await Promise.all([
    prisma.service.findMany({ where: { activo: true }, orderBy: { precio: "asc" } }),
    prisma.user.findMany({
      where: { rol: "barbero", activo: true },
      orderBy: { nombre: "asc" },
      include: { services: true },
    }),
    firstOpenDate(settings.hours, settings.timezone),
  ]);

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
      <BookingWizard
        services={services}
        barbers={barbers.map((barber) => ({
          id: barber.id,
          nombre: barber.nombre,
          serviceIds: barber.services.map((link) => link.serviceId),
        }))}
        qrSrc={mediaSrc(settings.qrImageUrl)}
        initialDate={initialDate}
        mode="public"
      />
    </main>
  );
}
