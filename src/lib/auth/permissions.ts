import type { AppRole, NavItem } from "@/lib/types";
import { APP_NAV } from "@/lib/nav";

function isVendedoraPath(path: string): boolean {
  if (path === "/pagos") return true;
  if (path.startsWith("/recibos/")) return true;
  return false;
}

/** Rutas del shell autenticado y roles permitidos. */
export function canAccessPath(pathname: string, role: AppRole): boolean {
  const path = pathname.split("?")[0] || "/";

  if (role === "vendedora") {
    return isVendedoraPath(path);
  }

  if (path === "/usuarios") {
    return role === "superadmin";
  }

  return true;
}

export function homePathForRole(role: AppRole): string {
  return role === "vendedora" ? "/pagos" : "/";
}

export function navForRole(role: AppRole): NavItem[] {
  if (role === "vendedora") {
    return [
      {
        href: "/pagos",
        label: "Registrar cobro",
        shortLabel: "Cobros",
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

export function bottomNavForRole(role: AppRole): NavItem[] {
  const nav = navForRole(role);
  if (role === "vendedora") return nav;

  const mobileHrefs = new Set([
    "/",
    "/compras",
    "/pagos",
    "/clientes",
    "/inventario",
  ]);
  return nav.filter((item) => mobileHrefs.has(item.href));
}
