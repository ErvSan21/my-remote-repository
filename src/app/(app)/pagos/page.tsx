import { requireAuth } from "@/lib/auth/guards";
import { listClientsAction } from "@/app/actions/clients";
import { listOpenConsignmentsAction } from "@/app/actions/consignments";
import { listClientPaymentsAction } from "@/app/actions/client-payments";
import { ClientPaymentsManager } from "@/components/client-payments/client-payments-manager";

export const dynamic = "force-dynamic";

export default async function PagosClientesPage() {
  const auth = await requireAuth();
  const [clientsRes, consRes, paymentsRes] = await Promise.all([
    listClientsAction(false),
    listOpenConsignmentsAction(),
    listClientPaymentsAction(),
  ]);

  return (
    <ClientPaymentsManager
      clients={clientsRes.clients}
      consignments={consRes.consignments}
      payments={paymentsRes.payments}
      listError={clientsRes.error || consRes.error || paymentsRes.error}
      isVendedora={auth.profile.role === "vendedora"}
    />
  );
}
