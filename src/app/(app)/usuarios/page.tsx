import { redirect } from "next/navigation";
import { UsersScreen, type UserStats } from "@/components/users-screen";
import { getAuthContext } from "@/lib/auth/session";
import { listUsersAction } from "@/app/actions/users";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Cuántas compras, ventas y cobros registró cada usuario. */
async function loadStats(): Promise<Record<string, UserStats>> {
  const supabase = await createClient();
  const [compras, ventas, cobros] = await Promise.all([
    supabase.from("purchases").select("created_by"),
    supabase.from("consignments").select("created_by"),
    supabase.from("client_payments").select("recorded_by"),
  ]);
  const stats: Record<string, UserStats> = {};
  const bump = (id: string | null | undefined, key: keyof UserStats) => {
    if (!id) return;
    stats[id] ??= { compras: 0, ventas: 0, cobros: 0 };
    stats[id][key] += 1;
  };
  for (const row of compras.data ?? []) bump(row.created_by, "compras");
  for (const row of ventas.data ?? []) bump(row.created_by, "ventas");
  for (const row of cobros.data ?? []) bump(row.recorded_by, "cobros");
  return stats;
}

export default async function UsuariosPage() {
  const auth = await getAuthContext();
  if (!auth || auth.profile.role !== "superadmin") {
    redirect("/");
  }

  const [{ users, error }, stats] = await Promise.all([listUsersAction(), loadStats()]);

  return <UsersScreen users={users} stats={stats} listError={error} currentUserId={auth.user.id} />;
}
