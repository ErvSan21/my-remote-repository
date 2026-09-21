import { PlaceholderModule } from "@/components/placeholder-module";

export default function ComprasPage() {
  return (
    <PlaceholderModule
      title="Compras"
      description="Registrar compras de pollo en pie. Puedes cargar la cantidad ahora y el precio después (negociado)."
      bullets={[
        "Cantidad de aves obligatoria al crear",
        "Precio unitario opcional → estado pending_price",
        "Al fijar precio se calcula deuda automáticamente",
      ]}
    />
  );
}
