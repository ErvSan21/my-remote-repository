import Link from "next/link";
import { APP_NAV } from "@/lib/nav";

type AppShellProps = {
  title?: string;
  children: React.ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-name">Sistema Pollo</p>
            <p className="brand-sub">SC / Mairana / CBBA → La Paz</p>
          </div>
        </div>
        {title ? <h1 className="page-title-mobile">{title}</h1> : null}
        <Link href="/login" className="header-link">
          Salir
        </Link>
      </header>

      <div className="app-body">
        <aside className="side-nav" aria-label="Navegación principal">
          <p className="side-nav-label">Menú</p>
          <nav className="side-nav-list">
            {APP_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="side-nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="app-main">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {APP_NAV.filter((i) =>
          ["/", "/compras", "/pagos", "/clientes", "/inventario"].includes(i.href),
        ).map((item) => (
          <Link key={item.href} href={item.href} className="bottom-nav-link">
            <span>{item.shortLabel ?? item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
