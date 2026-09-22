import { notFound } from "next/navigation";
import { requireAdmin, isSuperadminRole } from "@/lib/auth/guards";
import { getSupplierAction } from "@/app/actions/suppliers";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { ProveedorDetail } from "@/components/suppliers/proveedor-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProveedorDetailPage({ params }: Props) {
  const auth = await requireAdmin();
  const { id } = await params;
  const [{ supplier, error }, debts] = await Promise.all([
    getSupplierAction(id),
    getSupplierDebtsAction(),
  ]);
  if (error || !supplier) notFound();

  const debt =
    debts.perSupplier.find((r) => r.supplier_id === id)?.owed ?? 0;

  return (
    <ProveedorDetail
      supplier={supplier}
      debt={debt}
      canEdit={isSuperadminRole(auth.profile.role)}
    />
  );
}
