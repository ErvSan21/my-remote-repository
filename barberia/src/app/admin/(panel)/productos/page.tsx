import Link from "next/link";
import { prisma } from "@/lib/db";
import { bolivianos } from "@/lib/format";
import { requireAdmin } from "@/lib/guards";
import { buttonClass } from "@/lib/ui";

export const metadata = { title: "Productos" };

export default async function ProductosPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({ orderBy: { nombre: "asc" } });
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Productos</h1>
      <Link href="/admin/productos/nuevo" className={buttonClass}>
        Nuevo producto
      </Link>
      <ul>
        {products.map((product) => (
          <li key={product.id} className="border-t border-[#d5e0da]">
            <Link href={`/admin/productos/${product.id}`} className="block min-h-16 py-3">
              <span className="block">{product.nombre}</span>
              <span className="block text-sm text-[#3e564c]">
                {bolivianos(product.precioVenta)} · costo {bolivianos(product.costo)} · stock {product.stock}
                {product.activo ? "" : " · oculto"}
              </span>
              {product.stock <= product.stockBajo ? (
                <span className="block text-sm text-signal">Quedan {product.stock}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
