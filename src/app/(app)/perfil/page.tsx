import { ProfileScreen } from "@/components/profile/profile-screen";
import { requireAuth } from "@/lib/auth/guards";
import { roleLabel } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { phoneDigits } from "@/lib/validation";

export const dynamic = "force-dynamic";

function splitName(fullName: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] ?? "",
    last: parts.slice(1).join(" "),
  };
}

function savedFullName(profileName: string | null, metadata: unknown) {
  if (metadata && typeof metadata === "object" && "full_name" in metadata) {
    const value = (metadata as { full_name?: unknown }).full_name;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return profileName;
}

export default async function PerfilPage() {
  const auth = await requireAuth();
  const name = splitName(savedFullName(auth.profile.full_name, auth.user.user_metadata));
  const metadataPhone = auth.user.user_metadata?.phone;
  const phone = phoneDigits(typeof metadataPhone === "string" ? metadataPhone : "");
  const isSuperadmin = auth.profile.role === "superadmin";

  let usersCount: number | null = null;
  if (isSuperadmin) {
    const supabase = await createClient();
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    usersCount = count ?? null;
  }

  return (
    <ProfileScreen
      firstName={name.first}
      lastName={name.last}
      email={auth.user.email ?? ""}
      username={auth.profile.username}
      phone={phone}
      roleLabel={roleLabel(auth.profile.role)}
      isSuperadmin={isSuperadmin}
      usersCount={usersCount}
    />
  );
}
