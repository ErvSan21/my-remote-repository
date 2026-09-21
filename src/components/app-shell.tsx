import { signOutAction } from "@/app/actions/auth";
import { bottomNavForRole, navForRole } from "@/lib/auth/permissions";
import { FloatingDock } from "@/components/floating-dock";
import { SideNavLinks } from "@/components/side-nav-links";
import type { AppRole } from "@/lib/types";
import type { ReactNode } from "react";

type AppShellProps = {
  role: AppRole;
  displayName?: string | null;
  children: ReactNode;
};

export function AppShell({ role, displayName, children }: AppShellProps) {
  const nav = navForRole(role);
  const bottomNav = bottomNavForRole(role);
  const roleLabel =
    role === "superadmin"
      ? "Superadmin"
      : role === "admin"
        ? "Admin"
        : "Vendedora";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-name">MAC</p>
            <p className="brand-sub">
              {displayName ? `${displayName} · ${roleLabel}` : roleLabel}
            </p>
          </div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="header-link header-button">
            Salir
          </button>
        </form>
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
