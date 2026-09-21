import { PlaceholderModule } from "@/components/placeholder-module";

export default function ClientesPage() {
  return (
    <PlaceholderModule
      title="Clientes / Consignación"
      description="Dejar pollo en consignación en La Paz y El Alto; cobrar en cuotas o al entregar; emitir recibo con código único."
      bullets={[
        "CRUD de clientes por zona",
        "Consignaciones abiertas / parciales / cerradas",
        "Al pagar: recibo RCP-YYYYMMDD-XXXX",
      ]}
    />
  );
}
