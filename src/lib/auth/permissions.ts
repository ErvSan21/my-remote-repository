import type { AppRole, NavItem } from "@/lib/types";
import { APP_NAV } from "@/lib/nav";

const VENDEDORA_PATHS = new Set(["/pagos"]);

/** Rutas del shell autenticado y roles permitidos. */
export function canAccessPath(pathname: string, role: AppRole): boolean {
  const path = pathname.split("?")[0] || "/";

  if (role === "vendedora") {
    return VENDEDORA_PATHS.has(path);
  }

  if (path === "/usuarios") {
    return role === "superadmin";
  }

  // admin y superadmin: resto del app
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
        label: "Registrar pago",
        shortLabel: "Pagos",
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
