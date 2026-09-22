import { requireAuth, isAdminRole } from "@/lib/auth/guards";
import { listClientsAction } from "@/app/actions/clients";
import { listVentasAction } from "@/app/actions/consignments";
import { VentasManager } from "@/components/ventas/ventas-manager";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const auth = await requireAuth();
  const canCreate = isAdminRole(auth.profile.role);
  const [ventasRes, clientsRes] = await Promise.all([
    listVentasAction(),
    listClientsAction(false),
  ]);

  return (
    <VentasManager
      ventas={ventasRes.ventas}
      clients={clientsRes.clients}
      listError={ventasRes.error || clientsRes.error}
      canCreate={canCreate}
      showClientesTab={canCreate}
    />
  );
}
