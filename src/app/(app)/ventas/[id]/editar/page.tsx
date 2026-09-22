import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth/guards";
import { getVentaAction } from "@/app/actions/consignments";
import { listClientsAction } from "@/app/actions/clients";
import { VentaEditForm } from "@/components/ventas/venta-edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function VentaEditarPage({ params }: Props) {
  await requireSuperadmin();
  const { id } = await params;
  const [{ venta, error }, clientsRes] = await Promise.all([
    getVentaAction(id),
    listClientsAction(true),
  ]);
  if (error || !venta) notFound();

  return <VentaEditForm venta={venta} clients={clientsRes.clients} />;
}
