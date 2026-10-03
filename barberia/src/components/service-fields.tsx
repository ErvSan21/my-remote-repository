import { inputClass } from "@/lib/ui";

export function ServiceFields({
  service,
}: {
  service?: {
    id: string;
    nombre: string;
    descripcion: string;
    duracionMin: number;
    precio: number;
    cuentaFidelidad: boolean;
    activo: boolean;
  };
}) {
  return (
    <>
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <label className="grid gap-1 text-sm">
        Nombre
        <input className={inputClass} name="nombre" defaultValue={service?.nombre} required />
      </label>
      <label className="grid gap-1 text-sm">
        Descripción
        <input className={inputClass} name="descripcion" defaultValue={service?.descripcion} />
      </label>
      <label className="grid gap-1 text-sm">
        Duración en minutos
        <input className={inputClass} name="duracionMin" inputMode="numeric" defaultValue={service?.duracionMin} required />
      </label>
      <label className="grid gap-1 text-sm">
        Precio
        <input className={inputClass} name="precio" inputMode="numeric" defaultValue={service?.precio} required />
      </label>
      <label className="flex min-h-12 items-center gap-2">
        <input name="cuentaFidelidad" type="checkbox" defaultChecked={service?.cuentaFidelidad ?? true} />
        Cuenta para el corte gratis
      </label>
      <label className="flex min-h-12 items-center gap-2">
        <input name="activo" type="checkbox" defaultChecked={service?.activo ?? true} />
        Visible en el sitio
      </label>
    </>
  );
}
