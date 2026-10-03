import Link from "next/link";
import { prisma } from "@/lib/db";
import { one } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { inputClass } from "@/lib/ui";

export const metadata = { title: "Clientes" };

export default async function ClientesPage(props: { searchParams: Promise<{ q?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), props.searchParams]);
  const q = one(params.q)?.trim() ?? "";
  const clients = await prisma.client.findMany({
    where: {
      ...(user.rol === "barbero" ? { appointments: { some: { barberId: user.id } } } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q } },
              { apellido: { contains: q } },
              { telefono: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { apellido: "asc" },
  });

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Clientes</h1>
      <form className="grid grid-cols-[1fr_auto] gap-2" action="/admin/clientes">
        <input className={inputClass} name="q" defaultValue={q} placeholder="Nombre o teléfono" />
        <button className="h-12 border border-ink bg-white px-3" type="submit">
          Buscar
        </button>
      </form>
      {clients.length === 0 ? <p>No hay clientes con esa búsqueda.</p> : null}
      <ul>
        {clients.map((client) => (
          <li key={client.id} className="border-t border-[#d5e0da]">
            <Link href={`/admin/clientes/${client.id}`} className="block min-h-16 py-3">
              <span className="block">
                {client.nombre} {client.apellido}
              </span>
              <span className="block text-sm text-[#3e564c]">
                {client.telefono} · {client.visitasTotales} visitas
                {client.cortesGratisDisponibles > 0 ? ` · ${client.cortesGratisDisponibles} corte gratis` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
