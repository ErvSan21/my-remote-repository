import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { bottomNavForRole, navForRole } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

type AppShellProps = {
  role: AppRole;
  displayName?: string | null;
  children: React.ReactNode;
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
            <p className="brand-name">Sistema Pollo</p>
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
          <nav className="side-nav-list">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="side-nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="app-main">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {bottomNav.map((item) => (
          <Link key={item.href} href={item.href} className="bottom-nav-link">
            <span>{item.shortLabel ?? item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
