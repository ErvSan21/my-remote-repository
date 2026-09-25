import { redirect } from "next/navigation";
import { ProvisionalPasswordForm } from "@/components/auth/provisional-password-form";
import { requireAuth } from "@/lib/auth/guards";
import { homePathForRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function CambiarContrasenaPage() {
  const auth = await requireAuth();
  if (!auth.profile.must_change_password) {
    redirect(homePathForRole(auth.profile.role, auth.profile.enabled_modules));
  }

  return (
    <ProvisionalPasswordForm
      role={auth.profile.role}
      modules={auth.profile.enabled_modules}
    />
  );
}
