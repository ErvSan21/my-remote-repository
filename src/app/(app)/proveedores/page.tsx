import { requireAdmin } from "@/lib/auth/guards";
import { listSuppliersAction } from "@/app/actions/suppliers";
import { SuppliersManager } from "@/components/suppliers/suppliers-manager";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  await requireAdmin();
  const { suppliers, error } = await listSuppliersAction(true);

  return <SuppliersManager suppliers={suppliers} listError={error} />;
}
