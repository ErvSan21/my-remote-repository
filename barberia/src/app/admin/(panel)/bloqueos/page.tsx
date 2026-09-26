import { createBlock, deleteBlock } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { prisma } from "@/lib/db";
import { formatLong } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { inputClass, quietButtonClass } from "@/lib/ui";

export const metadata = { title: "Bloqueos" };

export default async function BloqueosPage() {
  const user = await requireUser();
  const [barbers, blocks] = await Promise.all([
    user.rol === "admin" ? prisma.user.findMany({ where: { rol: "barbero", activo: true }, orderBy: { nombre: "asc" } }) : Promise.resolve([]),
    prisma.block.findMany({
      where: user.rol === "barbero" ? { barberId: user.id } : {},
      include: { barber: true },
      orderBy: { fechaInicio: "asc" },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-4xl leading-none">Bloqueos</h1>
      <AdminForm action={createBlock} submitLabel="Bloquear horario">
        {user.rol === "admin" ? (
          <label className="grid gap-1 text-sm">
            Barbero
            <select className={inputClass} name="barberId" required>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-1 text-sm">
          Desde
          <input className={inputClass} type="date" name="fechaInicio" required />
        </label>
        <label className="grid gap-1 text-sm">
          Hasta
          <input className={inputClass} type="date" name="fechaFin" required />
        </label>
        <label className="flex min-h-12 items-center gap-2 text-base">
          <input name="todoElDia" type="checkbox" />
          Día completo
        </label>
        <label className="grid gap-1 text-sm">
          Hora de inicio
          <input className={inputClass} type="time" name="horaInicio" />
        </label>
        <label className="grid gap-1 text-sm">
          Hora de fin
          <input className={inputClass} type="time" name="horaFin" />
        </label>
        <label className="grid gap-1 text-sm">
          Motivo
          <input className={inputClass} name="motivo" />
        </label>
      </AdminForm>
      <ul>
        {blocks.map((block) => (
          <li key={block.id} className="grid gap-2 border-t border-[#d5e0da] py-3">
            <p>
              {formatLong(block.fechaInicio)}
              {block.fechaFin !== block.fechaInicio ? ` al ${formatLong(block.fechaFin)}` : ""}
            </p>
            <p className="text-sm text-[#3e564c]">
              {block.horaInicio && block.horaFin ? `${block.horaInicio} a ${block.horaFin}` : "Día completo"}
              {user.rol === "admin" ? ` · ${block.barber.nombre}` : ""}
              {block.motivo ? ` · ${block.motivo}` : ""}
            </p>
            <form action={deleteBlock}>
              <input type="hidden" name="id" value={block.id} />
              <button className={quietButtonClass} type="submit">
                Quitar bloqueo
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
