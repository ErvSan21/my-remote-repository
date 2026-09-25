import { bottomNavForRole, navForRole } from "@/lib/auth/permissions";
import { FloatingDock } from "@/components/floating-dock";
import { ProfileMenu } from "@/components/profile-menu";
import { SideNavLinks } from "@/components/side-nav-links";
import type { AppRole } from "@/lib/types";
import type { ReactNode } from "react";

type AppShellProps = {
  role: AppRole;
  email?: string | null;
  modules?: string[] | null;
  children: ReactNode;
};

export function AppShell({ role, email, modules = null, children }: AppShellProps) {
  const nav = navForRole(role, modules);
  const bottomNav = bottomNavForRole(role, modules);

  return (
    <div className="app-shell">
      <header className="app-header app-header-slim">
        <div className="brand-lockup">
          <div>
            <p className="brand-name">GESTIÓN AVÍCOLA - MAC</p>
            {email ? <p className="brand-sub">{email}</p> : null}
          </div>
        </div>
        <ProfileMenu showUsers={role === "superadmin"} />
      </header>

      <div className="app-body">
        <aside className="side-nav" aria-label="Navegación principal">
          <p className="side-nav-label">Menú</p>
          <SideNavLinks items={nav} />
        </aside>

        <main className="app-main">{children}</main>
      </div>

      <FloatingDock items={bottomNav} />
    </div>
  );
}
