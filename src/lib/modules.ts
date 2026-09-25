import type { AppRole } from "@/lib/types";

export type AppModule = "inicio" | "ventas" | "compras" | "clientes" | "proveedores";

export const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "vendedora", label: "Ventas" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Super admin" },
];

export const APP_MODULES: {
  key: AppModule;
  label: string;
  roles: AppRole[];
}[] = [
  { key: "inicio", label: "Inicio", roles: ["admin", "superadmin"] },
  { key: "ventas", label: "Ventas", roles: ["vendedora", "admin", "superadmin"] },
  { key: "compras", label: "Compras", roles: ["admin", "superadmin"] },
  { key: "clientes", label: "Clientes", roles: ["admin", "superadmin"] },
  { key: "proveedores", label: "Proveedores", roles: ["admin", "superadmin"] },
];

const MODULE_KEYS = new Set<string>(APP_MODULES.map((item) => item.key));

export function roleLabel(role: AppRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;
}

export function modulesAllowedForRole(role: AppRole): AppModule[] {
  return APP_MODULES.filter((item) => item.roles.includes(role)).map((item) => item.key);
}

export function moduleLabel(key: AppModule): string {
  return APP_MODULES.find((item) => item.key === key)?.label ?? key;
}

/** null = todos los módulos del rol. Un arreglo guarda la selección explícita. */
export function effectiveModules(
  role: AppRole,
  enabled: string[] | null | undefined,
): AppModule[] {
  const allowed = modulesAllowedForRole(role);
  if (enabled == null) return allowed;
  const allowedSet = new Set(allowed);
  return enabled.filter((item): item is AppModule => allowedSet.has(item as AppModule));
}

export function sanitizeModules(role: AppRole, enabled: unknown): AppModule[] {
  const allowed = new Set(modulesAllowedForRole(role));
  if (!Array.isArray(enabled)) return modulesAllowedForRole(role);
  return enabled.filter(
    (item): item is AppModule => typeof item === "string" && allowed.has(item as AppModule),
  );
}

export function isAppModule(value: string): value is AppModule {
  return MODULE_KEYS.has(value);
}

export function moduleForPath(path: string): AppModule | "usuarios" | null {
  if (path === "/") return "inicio";
  if (
    path === "/ventas" ||
    path.startsWith("/ventas/") ||
    path === "/pagos" ||
    path.startsWith("/pagos/") ||
    path.startsWith("/recibos/")
  ) {
    return "ventas";
  }
  if (path === "/compras" || path.startsWith("/compras/")) return "compras";
  if (path === "/clientes" || path.startsWith("/clientes/")) return "clientes";
  if (path === "/proveedores" || path.startsWith("/proveedores/")) return "proveedores";
  if (path === "/usuarios" || path.startsWith("/usuarios/")) return "usuarios";
  return null;
}
