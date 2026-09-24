import { notFound } from "next/navigation";
import { requireAuth, isSuperadminRole } from "@/lib/auth/guards";
import { getVentaAction } from "@/app/actions/consignments";
import { VentaDetail } from "@/components/ventas/venta-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function VentaDetailPage({ params }: Props) {
  const auth = await requireAuth();
  const { id } = await params;
  const { venta, error } = await getVentaAction(id);
  if (error || !venta) notFound();

  return (
    <VentaDetail
      venta={venta}
      canEdit={isSuperadminRole(auth.profile.role)}
      canDelete={isSuperadminRole(auth.profile.role)}
    />
  );
}
