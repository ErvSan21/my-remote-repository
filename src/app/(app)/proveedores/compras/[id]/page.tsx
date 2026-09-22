import { notFound } from "next/navigation";
import { requireAdmin, isSuperadminRole } from "@/lib/auth/guards";
import { getPurchaseAction } from "@/app/actions/purchases";
import { CompraDetail } from "@/components/purchases/compra-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CompraDetailPage({ params }: Props) {
  const auth = await requireAdmin();
  const { id } = await params;
  const { purchase, error } = await getPurchaseAction(id);
  if (error || !purchase) notFound();

  return (
    <CompraDetail
      purchase={purchase}
      canEdit={isSuperadminRole(auth.profile.role)}
    />
  );
}
