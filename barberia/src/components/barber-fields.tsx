import { inputClass } from "@/lib/ui";

export function BarberFields({
  barber,
  services,
}: {
  barber?: { id: string; nombre: string; email: string; serviceIds: string[] };
  services: { id: string; nombre: string }[];
}) {
  return (
    <>
      {barber ? <input type="hidden" name="id" value={barber.id} /> : null}
      <label className="grid gap-1 text-sm">
        Nombre
        <input className={inputClass} name="nombre" defaultValue={barber?.nombre} required />
      </label>
      <label className="grid gap-1 text-sm">
        Email
        <input className={inputClass} name="email" type="email" defaultValue={barber?.email} required />
      </label>
      <label className="grid gap-1 text-sm">
        {barber ? "Nueva contraseña, si quieres cambiarla" : "Contraseña"}
        <input className={inputClass} name="password" type="password" autoComplete="new-password" required={!barber} />
      </label>
      <label className="grid gap-1 text-sm">
        Foto
        <input name="foto" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm">Servicios que realiza</legend>
        {services.map((service) => (
          <label key={service.id} className="flex min-h-12 items-center gap-2">
            <input
              type="checkbox"
              name="serviceId"
              value={service.id}
              defaultChecked={barber?.serviceIds.includes(service.id) ?? true}
            />
            {service.nombre}
          </label>
        ))}
      </fieldset>
    </>
  );
}
