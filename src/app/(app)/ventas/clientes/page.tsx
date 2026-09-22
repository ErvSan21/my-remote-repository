import { requireAdmin } from "@/lib/auth/guards";
import { listClientsAction } from "@/app/actions/clients";
import { ClientsManager } from "@/components/clients/clients-manager";

export const dynamic = "force-dynamic";

export default async function VentasClientesPage() {
  await requireAdmin();
  const clientsRes = await listClientsAction(true);

  return (
    <ClientsManager
      clients={clientsRes.clients}
      listError={clientsRes.error}
    />
  );
}
