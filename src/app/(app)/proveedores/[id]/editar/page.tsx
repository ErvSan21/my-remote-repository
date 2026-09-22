import { requireSuperadmin } from "@/lib/auth/guards";
import { notFound } from "next/navigation";
import { getSupplierAction } from "@/app/actions/suppliers";
import { ProveedorEditForm } from "@/components/suppliers/proveedor-edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProveedorEditarPage({ params }: Props) {
  await requireSuperadmin();
  const { id } = await params;
  const { supplier, error } = await getSupplierAction(id);
  if (error || !supplier) notFound();
  return <ProveedorEditForm supplier={supplier} />;
}
