import { PlaceholderModule } from "@/components/placeholder-module";

export default function PagosPage() {
  return (
    <PlaceholderModule
      title="Pagos"
      description="Registrar pagos a proveedores o cobros. La vendedora solo usa esta pantalla (QR o efectivo + monto)."
      bullets={[
        "Método: efectivo o QR",
        "Pago parcial o total",
        "Asignar a una compra o dejar a cuenta del proveedor",
        "Rol vendedora: sin ver totales globales sensibles",
      ]}
    />
  );
}
