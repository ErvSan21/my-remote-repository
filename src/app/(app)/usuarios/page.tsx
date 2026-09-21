import { redirect } from "next/navigation";
import { UsersAdmin } from "@/components/users-admin";
import { getAuthContext } from "@/lib/auth/session";
import { listUsersAction } from "@/app/actions/users";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const auth = await getAuthContext();
  if (!auth || auth.profile.role !== "superadmin") {
    redirect("/");
  }

  const { users, error } = await listUsersAction();

  return <UsersAdmin users={users} listError={error} />;
}
