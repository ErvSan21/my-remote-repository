import { effectiveModules, moduleForPath, type AppModule } from "@/lib/modules";
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

function isSuperadminEdit(path: string): boolean {
  return (
    /^\/ventas\/[^/]+\/editar\/?$/.test(path) ||
    /^\/proveedores\/[^/]+\/editar\/?$/.test(path) ||
    /^\/compras\/[^/]+\/editar\/?$/.test(path)
  );
}

/** Rutas del shell autenticado, según rol y módulos habilitados. */
export function canAccessPath(
  pathname: string,
  role: AppRole,
  enabledModules?: string[] | null,
): boolean {
  const path = pathname.split("?")[0] || "/";

  if (path === "/perfil" || path === "/cambiar-contrasena") return true;

  const moduleName = moduleForPath(path);
  if (moduleName === "usuarios") return role === "superadmin";

  const enabled = new Set(effectiveModules(role, enabledModules));
  if (moduleName && !enabled.has(moduleName as AppModule)) return false;

  if (role === "vendedora") return isVendedoraPath(path);
  if (isSuperadminEdit(path)) return role === "superadmin";
  return true;
}

export function homePathForRole(
  role: AppRole,
  enabledModules?: string[] | null,
): string {
  const enabled = effectiveModules(role, enabledModules);
  if (enabled.includes("inicio")) return "/";
  if (enabled.includes("ventas")) return "/ventas";
  if (enabled.includes("compras")) return "/compras";
  if (enabled.includes("clientes")) return "/clientes";
  if (enabled.includes("proveedores")) return "/proveedores";
  if (role === "superadmin") return "/usuarios";
  return "/perfil";
}

const USUARIOS_NAV: NavItem = {
  href: "/usuarios",
  label: "Usuarios",
  shortLabel: "Usuarios",
  icon: "users",
  roles: ["superadmin"],
};

export function navForRole(
  role: AppRole,
  enabledModules?: string[] | null,
): NavItem[] {
  const enabled = new Set(effectiveModules(role, enabledModules));
  const items = APP_NAV.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.module && !enabled.has(item.module)) return false;
    return true;
  });
  if (role === "superadmin") items.push(USUARIOS_NAV);
  return items;
}

/** Dock móvil: Inicio, Ventas, Compras, Clientes, Proveedores. Usuarios va en el menú de perfil. */
export function bottomNavForRole(
  role: AppRole,
  enabledModules?: string[] | null,
): NavItem[] {
  const nav = navForRole(role, enabledModules);
  if (role === "vendedora") return nav.filter((item) => item.href !== "/usuarios");

  const mobileHrefs = ["/", "/ventas", "/compras", "/clientes", "/proveedores"];
  return mobileHrefs
    .map((href) => nav.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
}
