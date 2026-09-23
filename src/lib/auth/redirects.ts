/**
 * Solo rutas internas de la app. Rechaza protocol-relative, backslash
 * (el parser de URL lo trata como `/` y abre `https://host`) y esquemas.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function safeInternalPath(
  input: string | null | undefined,
): string | null {
  if (!input || typeof input !== "string") return null;
  if (input.length > 200) return null;
  if (input.includes("\\") || input.includes("%") || input.includes("//")) {
    return null;
  }
  if (/[\u0000-\u001F\u007F]/.test(input)) return null;

  const path = input.split(/[?#]/)[0] ?? "";
  if (path !== input) return null;
  if (!path.startsWith("/")) return null;

  const segments = path.split("/").slice(1);
  if (path === "/") return "/";
  if (segments.some((segment) => !SAFE_SEGMENT.test(segment))) return null;
  if (path === "/login" || path.startsWith("/login/")) return null;
  return path;
}
