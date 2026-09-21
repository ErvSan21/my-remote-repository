import { PlaceholderModule } from "@/components/placeholder-module";

export default function InventarioPage() {
  return (
    <PlaceholderModule
      title="Inventario"
      description="Consulta de pollo disponible y movimientos (entradas por compra, salidas por consignación/venta)."
      bullets={[
        "Vista v_pollo_disponible",
        "Historial de movimientos por lote",
        "Ajustes post-faena en Fase 2",
      ]}
    />
  );
}
