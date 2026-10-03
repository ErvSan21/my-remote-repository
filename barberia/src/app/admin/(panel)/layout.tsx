import { AdminShell } from "@/components/admin-shell";
import { requireUser } from "@/lib/guards";
import { getSettings } from "@/lib/shop";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  return (
    <AdminShell role={user.rol} nombre={user.nombre} shop={settings?.shopName ?? "Agenda"}>
      {children}
    </AdminShell>
  );
}
