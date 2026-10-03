import Link from "next/link";
import { toggleBarber } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { buttonClass, quietButtonClass } from "@/lib/ui";

export const metadata = { title: "Barberos" };

export default async function BarberosPage() {
  await requireAdmin();
  const barbers = await prisma.user.findMany({
    where: { rol: "barbero" },
    orderBy: { nombre: "asc" },
    include: { services: { include: { service: true } } },
  });
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Barberos</h1>
      <Link href="/admin/barberos/nuevo" className={buttonClass}>
        Nuevo barbero
      </Link>
      <ul className="grid gap-4">
        {barbers.map((barber) => (
          <li key={barber.id} className="grid gap-2 border-t border-[#d5e0da] py-3">
            <Link href={`/admin/barberos/${barber.id}`}>
              <span className="block text-lg">{barber.nombre}</span>
              <span className="block text-sm text-[#3e564c]">
                {barber.email} · {barber.activo ? "con acceso" : "sin acceso"}
              </span>
              <span className="block text-sm text-[#3e564c]">
                {barber.services.map((link) => link.service.nombre).join(", ") || "Sin servicios"}
              </span>
            </Link>
            <form action={toggleBarber}>
              <input type="hidden" name="id" value={barber.id} />
              <input type="hidden" name="activo" value={barber.activo ? "0" : "1"} />
              <button className={quietButtonClass} type="submit">
                {barber.activo ? "Quitar acceso" : "Dar acceso"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
