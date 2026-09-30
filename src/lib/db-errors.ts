/** true si Supabase rechazó el guardado porque una columna todavía no existe (falta una migración). */
export function missingColumnError(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();
  return error.code === "42703" || error.code === "PGRST204" || message.includes("schema cache");
}
