import { cache } from "react";
import { fetchProfileRow, type Profile } from "@/lib/auth/profile-row";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/env";
import type { User } from "@supabase/supabase-js";

export type { Profile };

export type AuthContext = {
  user: User;
  profile: Profile;
};

export const getAuthContext = cache(async function getAuthContext(): Promise<AuthContext | null> {
  if (!hasSupabasePublicEnv()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { profile, error } = await fetchProfileRow((columns) =>
    supabase.from("profiles").select(columns).eq("id", user.id).maybeSingle(),
  );

  if (error || !profile) {
    return null;
  }

  if (!profile.active) {
    return null;
  }

  return {
    user,
    profile: profile as Profile,
  };
});
