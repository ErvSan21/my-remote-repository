import { PlaceholderModule } from "@/components/placeholder-module";
import { requireAuth } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * Pagos de clientes (consignación). Ruta permitida para vendedora.
 * No muestra deudas de proveedores.
 */
export default async function PagosClientesPage() {
  const auth = await requireAuth();
  const isVendedora = auth.profile.role === "vendedora";

  return (
    <PlaceholderModule
      title={isVendedora ? "Registrar cobro" : "Pagos de clientes"}
      description={
        isVendedora
          ? "Aquí registrarás cobros a clientes (QR o efectivo + monto). No verás deudas de proveedores ni totales sensibles."
          : "Cobros a clientes / consignación. Los pagos a proveedores están en Pagos a proveedores."
      }
      bullets={
        isVendedora
          ? [
              "Método: efectivo o QR",
              "Monto del cobro",
              "Recibo con código — próximo sprint (clientes/consignación)",
            ]
          : [
              "Esta pantalla es para cobros de clientes",
              "Usa «Pagos a proveedores» para deudas de compra",
              "Formulario real de cobro + recibo en el próximo sprint",
            ]
      }
    />
  );
}
