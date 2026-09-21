import { PlaceholderModule } from "@/components/placeholder-module";
import { getAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const auth = await getAuthContext();
  const isVendedora = auth?.profile.role === "vendedora";

  return (
    <PlaceholderModule
      title={isVendedora ? "Registrar pago" : "Pagos"}
      description={
        isVendedora
          ? "Registra pagos con QR o efectivo e indica el monto. No verás deudas globales ni otros módulos sensibles."
          : "Registrar pagos a proveedores o cobros. La vendedora solo usa esta pantalla (QR o efectivo + monto)."
      }
      bullets={
        isVendedora
          ? [
              "Método: efectivo o QR",
              "Monto del pago",
              "El formulario de datos reales llega en el próximo sprint",
            ]
          : [
              "Método: efectivo o QR",
              "Pago parcial o total",
              "Asignar a una compra o dejar a cuenta del proveedor",
              "Rol vendedora: sin ver totales globales sensibles",
            ]
      }
    />
  );
}
