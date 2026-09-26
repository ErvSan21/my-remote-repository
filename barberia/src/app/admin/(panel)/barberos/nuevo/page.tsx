import { saveBarber } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { BarberFields } from "@/components/barber-fields";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";

export const metadata = { title: "Nuevo barbero" };

export default async function NuevoBarberoPage() {
  await requireAdmin();
  const services = await prisma.service.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Nuevo barbero</h1>
      <AdminForm action={saveBarber} submitLabel="Crear barbero">
        <BarberFields services={services} />
      </AdminForm>
    </div>
  );
}
