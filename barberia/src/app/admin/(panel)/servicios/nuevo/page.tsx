import { saveService } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { ServiceFields } from "@/components/service-fields";
import { requireAdmin } from "@/lib/guards";

export const metadata = { title: "Nuevo servicio" };

export default async function NuevoServicioPage() {
  await requireAdmin();
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Nuevo servicio</h1>
      <AdminForm action={saveService} submitLabel="Guardar servicio">
        <ServiceFields />
      </AdminForm>
    </div>
  );
}
