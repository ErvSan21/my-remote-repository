import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/booking-wizard";
import { prisma } from "@/lib/db";
import { mediaSrc } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { getSettings } from "@/lib/shop";
import { firstOpenDate } from "@/lib/slots";

export const metadata = { title: "Agendar" };

export default async function NuevaCitaPage() {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  if (!settings) notFound();
  const [services, barbers, initialDate] = await Promise.all([
    prisma.service.findMany({ where: { activo: true }, orderBy: { precio: "asc" } }),
    prisma.user.findMany({
      where: { rol: "barbero", activo: user.rol === "barbero" ? true : undefined },
      orderBy: { nombre: "asc" },
      include: { services: true },
    }),
    firstOpenDate(settings.hours, settings.timezone),
  ]);
  const visible = user.rol === "barbero" ? barbers.filter((barber) => barber.id === user.id) : barbers.filter((barber) => barber.activo);

  return (
    <div>
      <BookingWizard
        services={services}
        barbers={visible.map((barber) => ({
          id: barber.id,
          nombre: barber.nombre,
          serviceIds: barber.services.map((link) => link.serviceId),
        }))}
        qrSrc={mediaSrc(settings.qrImageUrl)}
        initialDate={initialDate}
        mode="manual"
        lockedBarberId={user.rol === "barbero" ? user.id : undefined}
      />
    </div>
  );
}
