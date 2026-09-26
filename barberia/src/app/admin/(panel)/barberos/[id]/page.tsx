import Link from "next/link";
import { notFound } from "next/navigation";
import { saveBarber } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { BarberFields } from "@/components/barber-fields";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const metadata = { title: "Barbero" };

export default async function BarberoPage(props: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await props.params;
  const [barber, services] = await Promise.all([
    prisma.user.findFirst({ where: { id, rol: "barbero" }, include: { services: true } }),
    prisma.service.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  if (!barber) notFound();
  return (
    <div className="grid gap-4">
      <Link href="/admin/barberos">Volver a barberos</Link>
      <h1 className="font-display text-4xl leading-none">{barber.nombre}</h1>
      <p className="text-sm text-[#3e564c]">{barber.activo ? "Tiene acceso." : "No tiene acceso. El historial se conserva."}</p>
      <AdminForm action={saveBarber} submitLabel="Guardar cambios">
        <BarberFields
          services={services}
          barber={{
            id: barber.id,
            nombre: barber.nombre,
            email: barber.email,
            serviceIds: barber.services.map((link) => link.serviceId),
          }}
        />
      </AdminForm>
    </div>
  );
}
