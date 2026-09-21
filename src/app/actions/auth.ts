"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/env";

export async function signOutAction() {
  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
