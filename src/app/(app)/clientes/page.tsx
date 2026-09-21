import { requireAdmin } from "@/lib/auth/guards";
import { listClientsAction } from "@/app/actions/clients";
import { listConsignmentsAction } from "@/app/actions/consignments";
import { getPolloDisponible } from "@/lib/inventory";
import { ClientsManager } from "@/components/clients/clients-manager";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  await requireAdmin();
  const [clientsRes, consRes, availableStock] = await Promise.all([
    listClientsAction(true),
    listConsignmentsAction(),
    getPolloDisponible(),
  ]);

  return (
    <ClientsManager
      clients={clientsRes.clients}
      consignments={consRes.consignments}
      availableStock={availableStock}
      listError={clientsRes.error || consRes.error}
    />
  );
}
