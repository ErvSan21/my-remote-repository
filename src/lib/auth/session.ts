import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/env";
import type { AppRole } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  role: AppRole;
  active: boolean;
};

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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();

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
