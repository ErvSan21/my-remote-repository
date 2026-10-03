import Image from "next/image";
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
    <main className="min-h-dvh bg-foam text-ink md:grid md:grid-cols-[minmax(0,0.85fr)_minmax(22rem,1fr)]">
      <div className="relative h-52 md:sticky md:top-0 md:h-dvh">
        <Image src="/fotos/corte.png" alt="" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-4 py-4 text-foam">
          <Link href="/" className="font-display text-3xl leading-none">
            {settings.shopName}
          </Link>
          <a href={waLink(settings.whatsappNumber, settings.whatsappMessage)}>WhatsApp</a>
        </div>
      </div>
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
