import { inputClass } from "@/lib/ui";

export function ProductFields({
  product,
}: {
  product?: {
    id: string;
    nombre: string;
    descripcion: string;
    precioVenta: number;
    costo: number;
    stock: number;
    stockBajo: number;
    activo: boolean;
  };
}) {
  return (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <label className="grid gap-1 text-sm">
        Nombre
        <input className={inputClass} name="nombre" defaultValue={product?.nombre} required />
      </label>
      <label className="grid gap-1 text-sm">
        Descripción
        <input className={inputClass} name="descripcion" defaultValue={product?.descripcion} />
      </label>
      <label className="grid gap-1 text-sm">
        Precio de venta
        <input className={inputClass} name="precioVenta" inputMode="numeric" defaultValue={product?.precioVenta ?? ""} required />
      </label>
      <label className="grid gap-1 text-sm">
        Costo
        <input className={inputClass} name="costo" inputMode="numeric" defaultValue={product?.costo ?? ""} required />
      </label>
      <label className="grid gap-1 text-sm">
        Stock
        <input className={inputClass} name="stock" inputMode="numeric" defaultValue={product?.stock ?? 0} required />
      </label>
      <label className="grid gap-1 text-sm">
        Avisar cuando queden
        <input className={inputClass} name="stockBajo" inputMode="numeric" defaultValue={product?.stockBajo ?? 3} required />
      </label>
      <label className="grid gap-1 text-sm">
        Foto
        <input name="foto" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      <label className="flex min-h-12 items-center gap-2">
        <input name="activo" type="checkbox" defaultChecked={product?.activo ?? true} />
        Visible en el sitio
      </label>
    </>
  );
}
