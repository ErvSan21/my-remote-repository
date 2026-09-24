import type { AppRole, NavItem } from "@/lib/types";
import { APP_NAV } from "@/lib/nav";

export function isAppRole(value: unknown): value is AppRole {
  return value === "vendedora" || value === "admin" || value === "superadmin";
}

function isVendedoraPath(path: string): boolean {
  if (path === "/ventas") return true;
  if (/^\/ventas\/[^/]+\/editar\/?$/.test(path)) return false;
  if (/^\/ventas\/[^/]+\/?$/.test(path)) return true;
  if (path === "/pagos" || path.startsWith("/pagos/")) return true;
  if (path.startsWith("/recibos/")) return true;
  return false;
}

/** Rutas del shell autenticado y roles permitidos. */
export function canAccessPath(pathname: string, role: AppRole): boolean {
  const path = pathname.split("?")[0] || "/";

  if (path === "/perfil") return true;

  if (role === "vendedora") {
    return isVendedoraPath(path);
  }

  if (path === "/usuarios") {
    return role === "superadmin";
  }

  if (/^\/ventas\/[^/]+\/editar\/?$/.test(path)) {
    return role === "superadmin";
  }

  if (
    /^\/proveedores\/[^/]+\/editar\/?$/.test(path) ||
    /^\/compras\/[^/]+\/editar\/?$/.test(path)
  ) {
    return role === "superadmin";
  }

  return true;
}

export function homePathForRole(role: AppRole): string {
  return role === "vendedora" ? "/ventas" : "/";
}

export function navForRole(role: AppRole): NavItem[] {
  if (role === "vendedora") {
    return [
      {
        href: "/ventas",
        label: "Ventas",
        shortLabel: "Ventas",
        icon: "cash",
        roles: ["vendedora", "admin", "superadmin"],
      },
    ];
  }

  return APP_NAV.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return role === "admin" || role === "superadmin";
    }
    return item.roles.includes(role);
  });
}

/** Dock: Inicio, Ventas, Compras, Clientes, Proveedores. */
export function bottomNavForRole(role: AppRole): NavItem[] {
  const nav = navForRole(role);
  if (role === "vendedora") return nav;

  const mobileHrefs = ["/", "/ventas", "/compras", "/clientes", "/proveedores"];
  return mobileHrefs
    .map((href) => nav.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
}
