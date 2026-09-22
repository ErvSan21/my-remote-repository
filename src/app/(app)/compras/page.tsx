import { requireAdmin } from "@/lib/auth/guards";
import { listSuppliersAction } from "@/app/actions/suppliers";
import { listPurchasesAction } from "@/app/actions/purchases";
import { PurchasesManager } from "@/components/purchases/purchases-manager";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  await requireAdmin();
  const [suppliersRes, purchasesRes] = await Promise.all([
    listSuppliersAction(false),
    listPurchasesAction(),
  ]);

  return (
    <PurchasesManager
      suppliers={suppliersRes.suppliers}
      purchases={purchasesRes.purchases}
      listError={suppliersRes.error || purchasesRes.error}
    />
  );
}
