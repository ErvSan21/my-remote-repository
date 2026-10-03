import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/guards";
import { quietButtonClass } from "@/lib/ui";

export const metadata = { title: "Más" };

const adminLinks = [
  ["/admin/bloqueos", "Bloqueos de horario"],
  ["/admin/servicios", "Servicios"],
  ["/admin/productos", "Productos y stock"],
  ["/admin/barberos", "Barberos"],
  ["/admin/configuracion", "Configuración"],
  ["/admin/perfil", "Google Calendar"],
] as const;

const barberLinks = [
  ["/admin/bloqueos", "Bloqueos de horario"],
  ["/admin/perfil", "Google Calendar"],
] as const;

export default async function MasPage() {
  const user = await requireUser();
  const links = user.rol === "admin" ? adminLinks : barberLinks;
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Más</h1>
      <ul>
        {links.map(([href, label]) => (
          <li key={href} className="border-t border-[#d5e0da]">
            <Link href={href} className="flex min-h-14 items-center">
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <form action={logout}>
        <button className={quietButtonClass} type="submit">
          Salir
        </button>
      </form>
    </div>
  );
}
