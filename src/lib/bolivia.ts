/** Los 9 departamentos de Bolivia, para ciudad de clientes y origen de proveedores. */
export const BOLIVIA_DEPARTAMENTOS = [
  "La Paz",
  "Cochabamba",
  "Santa Cruz",
  "Oruro",
  "Potosí",
  "Chuquisaca",
  "Tarija",
  "Beni",
  "Pando",
] as const;

export function isDepartamento(value: string) {
  return (BOLIVIA_DEPARTAMENTOS as readonly string[]).includes(value);
}
