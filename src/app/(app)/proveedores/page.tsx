import { requireAdmin } from "@/lib/auth/guards";
import { listSuppliersAction } from "@/app/actions/suppliers";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { SuppliersManager } from "@/components/suppliers/suppliers-manager";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  await requireAdmin();
  const [{ suppliers, error }, debts] = await Promise.all([
    listSuppliersAction(true),
    getSupplierDebtsAction(),
  ]);

  const debtsBySupplier: Record<string, number> = {};
  for (const row of debts.perSupplier) {
    debtsBySupplier[row.supplier_id] = row.owed;
  }

  return (
    <SuppliersManager
      suppliers={suppliers}
      debtsBySupplier={debtsBySupplier}
      listError={error || debts.error}
    />
  );
}
