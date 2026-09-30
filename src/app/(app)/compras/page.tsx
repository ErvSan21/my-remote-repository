import { requireAdmin } from "@/lib/auth/guards";
import { listSuppliersAction } from "@/app/actions/suppliers";
import { listPurchasesAction } from "@/app/actions/purchases";
import { ComprasManager } from "@/components/purchases/compras-manager";
import { loadPeople } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadSupplierPayments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplier_payments")
    .select("id, supplier_id, purchase_id, amount, method, paid_at, recorded_by")
    .order("paid_at", { ascending: false });
  return { payments: data ?? [], error: error?.message ?? null };
}

export default async function ComprasPage() {
  await requireAdmin();
  const [suppliersRes, purchasesRes, paymentsRes, people] = await Promise.all([
    listSuppliersAction(true),
    listPurchasesAction(),
    loadSupplierPayments(),
    loadPeople(),
  ]);

  return (
    <ComprasManager
      suppliers={suppliersRes.suppliers}
      purchases={purchasesRes.purchases}
      payments={paymentsRes.payments.map((p) => ({ ...p, amount: Number(p.amount) }))}
      people={people}
      listError={suppliersRes.error || purchasesRes.error || paymentsRes.error}
    />
  );
}
