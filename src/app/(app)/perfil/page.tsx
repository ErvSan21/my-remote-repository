import { ProfileForm } from "@/components/profile/profile-form";
import { requireAuth } from "@/lib/auth/guards";
import { phoneDigits } from "@/lib/validation";

export const dynamic = "force-dynamic";

function splitName(fullName: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] ?? "",
    last: parts.slice(1).join(" "),
  };
}

export default async function PerfilPage() {
  const auth = await requireAuth();
  const name = splitName(auth.profile.full_name);
  const metadataPhone = auth.user.user_metadata?.phone;
  const phone = phoneDigits(typeof metadataPhone === "string" ? metadataPhone : "");

  return (
    <ProfileForm
      firstName={name.first}
      lastName={name.last}
      email={auth.user.email ?? ""}
      phone={phone}
    />
  );
}
