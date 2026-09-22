import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth/guards";
import { getPurchaseAction } from "@/app/actions/purchases";
import { listSuppliersAction } from "@/app/actions/suppliers";
import { CompraEditForm } from "@/components/purchases/compra-edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CompraEditarPage({ params }: Props) {
  await requireSuperadmin();
  const { id } = await params;
  const [{ purchase, error }, suppliersRes] = await Promise.all([
    getPurchaseAction(id),
    listSuppliersAction(true),
  ]);
  if (error || !purchase) notFound();

  return (
    <CompraEditForm purchase={purchase} suppliers={suppliersRes.suppliers} />
  );
}
