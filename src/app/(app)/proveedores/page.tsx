import { PlaceholderModule } from "@/components/placeholder-module";

export default function ProveedoresPage() {
  return (
    <PlaceholderModule
      title="Proveedores"
      description="Alta, edición y baja de proveedores en Santa Cruz, Mairana, Cochabamba y otros."
      bullets={[
        "CRUD de proveedores (nombre, zona, teléfono)",
        "Ver deuda pendiente por proveedor",
        "Acceso rápido a compras y pagos del proveedor",
      ]}
    />
  );
}
