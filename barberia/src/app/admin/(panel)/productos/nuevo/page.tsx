import { saveProduct } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { ProductFields } from "@/components/product-fields";
import { requireAdmin } from "@/lib/guards";

export const metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  await requireAdmin();
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Nuevo producto</h1>
      <AdminForm action={saveProduct} submitLabel="Guardar producto">
        <ProductFields />
      </AdminForm>
    </div>
  );
}
