import { requireAuth } from "@/lib/auth/guards";
import { listVentasAction } from "@/app/actions/consignments";
import { VentasManager } from "@/components/ventas/ventas-manager";
import { loadPeople } from "@/lib/people";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  await requireAuth();
  const [ventasRes, people] = await Promise.all([listVentasAction(), loadPeople()]);

  return <VentasManager ventas={ventasRes.ventas} people={people} listError={ventasRes.error} />;
}
