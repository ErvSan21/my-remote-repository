import { requireAdmin } from "@/lib/auth/guards";
import { listSuppliersAction } from "@/app/actions/suppliers";
import { listPurchasesAction } from "@/app/actions/purchases";
import { getSupplierDebtsAction } from "@/app/actions/supplier-payments";
import { SupplierPaymentsManager } from "@/components/supplier-payments/supplier-payments-manager";

export const dynamic = "force-dynamic";

export default async function PagosProveedoresPage() {
  await requireAdmin();
  const [suppliersRes, purchasesRes, debts] = await Promise.all([
    listSuppliersAction(false),
    listPurchasesAction(),
    getSupplierDebtsAction(),
  ]);

  return (
    <SupplierPaymentsManager
      suppliers={suppliersRes.suppliers}
      purchases={purchasesRes.purchases}
      perSupplier={debts.perSupplier}
      totalOwed={debts.totalOwed}
      recentPayments={debts.recentPayments}
      listError={
        suppliersRes.error || purchasesRes.error || debts.error
      }
    />
  );
}
