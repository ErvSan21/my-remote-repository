import Link from "next/link";
import { notFound } from "next/navigation";
import { saveProduct } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { ProductFields } from "@/components/product-fields";
import { prisma } from "@/lib/db";
import { bolivianos, formatLong } from "@/lib/format";
import { requireAdmin } from "@/lib/guards";

export const metadata = { title: "Producto" };

export default async function ProductoPage(props: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await props.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { priceHistory: { orderBy: { createdAt: "desc" }, take: 8 } },
  });
  if (!product) notFound();
  return (
    <div className="grid gap-4">
      <Link href="/admin/productos">Volver a productos</Link>
      <h1 className="font-display text-4xl leading-none">{product.nombre}</h1>
      {product.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.foto} alt="" className="h-40 w-40 bg-white object-contain" />
      ) : null}
      <AdminForm action={saveProduct} submitLabel="Guardar cambios">
        <ProductFields product={product} />
      </AdminForm>
      <h2 className="font-display text-2xl">Cambios de precio</h2>
      <ul>
        {product.priceHistory.map((entry) => (
          <li key={entry.id} className="border-t border-[#d5e0da] py-2 text-sm">
            {formatLong(entry.createdAt.toISOString().slice(0, 10))} · venta {bolivianos(entry.precioVenta)} · costo {bolivianos(entry.costo)}
          </li>
        ))}
      </ul>
    </div>
  );
}
