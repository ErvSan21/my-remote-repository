import { requireUser } from "@/lib/guards";

export const metadata = { title: "Calendario" };

export default async function PerfilPage() {
  const user = await requireUser();
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Google Calendar</h1>
      <p>
        {user.nombre}, cada barbero conecta su propia cuenta. Cuando el negocio cargue las credenciales OAuth de Google,
        la cita se creará en el calendario de quien la atiende, y se actualizará si se cancela o se mueve.
      </p>
      <p className="text-sm text-[#3e564c]">
        Esa conexión todavía no está activa. La agenda de la barbería ya guarda las citas y el campo del evento de Google
        queda reservado para cuando se encienda.
      </p>
    </div>
  );
}
