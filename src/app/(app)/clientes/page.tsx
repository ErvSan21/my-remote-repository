import { requireAdmin } from "@/lib/auth/guards";
import { listClientsAction } from "@/app/actions/clients";
import { listVentasAction } from "@/app/actions/consignments";
import { ClientsManager } from "@/components/clients/clients-manager";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  await requireAdmin();
  const [clientsRes, ventasRes] = await Promise.all([
    listClientsAction(true),
    listVentasAction(),
  ]);

  return (
    <ClientsManager
      clients={clientsRes.clients}
      ventas={ventasRes.ventas}
      listError={clientsRes.error || ventasRes.error}
    />
  );
}
