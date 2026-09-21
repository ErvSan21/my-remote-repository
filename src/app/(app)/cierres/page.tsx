import { PlaceholderModule } from "@/components/placeholder-module";

export default function CierresPage() {
  return (
    <PlaceholderModule
      title="Cierres / PDF"
      description="Generar cierre de cuenta por proveedor y cierre semanal general para revisión de los admins."
      bullets={[
        "PDF por proveedor (compras, pagos, saldo)",
        "PDF semanal (totales del negocio)",
        "Rutas futuras: /api/pdf/proveedor/[id] y /api/pdf/cierre-semanal",
      ]}
    />
  );
}
