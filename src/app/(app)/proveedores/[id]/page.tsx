import { notFound } from "next/navigation";
import { requireAdmin, isSuperadminRole } from "@/lib/auth/guards";
import { listPurchasesAction } from "@/app/actions/purchases";
import { getSupplierAction } from "@/app/actions/suppliers";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { ProveedorDetail } from "@/components/suppliers/proveedor-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProveedorDetailPage({ params }: Props) {
  const auth = await requireAdmin();
  const { id } = await params;
  const [{ supplier, error }, debts, purchasesRes] = await Promise.all([
    getSupplierAction(id),
    getSupplierDebtsAction(),
    listPurchasesAction(),
  ]);
  if (error || !supplier) notFound();

  const debt = debts.perSupplier.find((row) => row.supplier_id === id)?.owed ?? 0;
  const purchases = purchasesRes.purchases
    .filter((purchase) => purchase.supplier_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((purchase, index) => ({
      ...purchase,
      numberLabel: String(index + 1).padStart(5, "0"),
    }));

  return (
    <ProveedorDetail
      supplier={supplier}
      debt={debt}
      purchases={purchases}
      canEdit={isSuperadminRole(auth.profile.role)}
    />
  );
}
