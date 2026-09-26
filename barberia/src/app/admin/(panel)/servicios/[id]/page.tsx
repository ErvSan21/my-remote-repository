import Link from "next/link";
import { notFound } from "next/navigation";
import { saveService } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { ServiceFields } from "@/components/service-fields";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const metadata = { title: "Servicio" };

export default async function ServicioPage(props: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await props.params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) notFound();
  return (
    <div className="grid gap-4">
      <Link href="/admin/servicios">Volver a servicios</Link>
      <h1 className="font-display text-4xl leading-none">{service.nombre}</h1>
      <AdminForm action={saveService} submitLabel="Guardar cambios">
        <ServiceFields service={service} />
      </AdminForm>
    </div>
  );
}
