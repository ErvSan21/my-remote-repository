import { PlaceholderModule } from "@/components/placeholder-module";

export default function UsuariosPage() {
  return (
    <PlaceholderModule
      title="Usuarios"
      description="Solo superadmin: listar perfiles, cambiar roles y resetear contraseñas vía Admin API de Supabase."
      bullets={[
        "Roles: vendedora · admin · superadmin",
        "Reset password (service role en servidor)",
        "Activar / desactivar usuarios",
      ]}
    />
  );
}
