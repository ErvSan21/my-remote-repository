import { AdminNav } from "@/components/admin-nav";
import { requireUser } from "@/lib/guards";
import { getSettings } from "@/lib/shop";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  return (
    <div className="min-h-dvh bg-sheet text-ink">
      <header className="mx-auto flex max-w-lg items-end justify-between px-4 pt-5">
        <p className="font-display text-3xl leading-none">{settings?.shopName ?? "Agenda"}</p>
        <p className="text-sm">{user.nombre}</p>
      </header>
      <div className="mx-auto max-w-lg px-4 pt-4 pb-28">{children}</div>
      <AdminNav />
    </div>
  );
}
