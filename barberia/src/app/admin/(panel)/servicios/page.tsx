import Link from "next/link";
import { prisma } from "@/lib/db";
import { bolivianos } from "@/lib/format";
import { requireAdmin } from "@/lib/guards";
import { buttonClass } from "@/lib/ui";

export const metadata = { title: "Servicios" };

export default async function ServiciosPage() {
  await requireAdmin();
  const services = await prisma.service.findMany({ orderBy: { nombre: "asc" } });
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Servicios</h1>
      <Link href="/admin/servicios/nuevo" className={buttonClass}>
        Nuevo servicio
      </Link>
      <ul>
        {services.map((service) => (
          <li key={service.id} className="border-t border-[#d5e0da]">
            <Link href={`/admin/servicios/${service.id}`} className="block min-h-16 py-3">
              <span className="block">{service.nombre}</span>
              <span className="block text-sm text-[#3e564c]">
                {service.duracionMin} min · {bolivianos(service.precio)}
                {service.activo ? "" : " · oculto"}
                {service.cuentaFidelidad ? "" : " · no suma fidelidad"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
