import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import {
  canAccessPath,
  homePathForRole,
} from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

/**
 * Refreshes the auth session cookies (official @supabase/ssr middleware pattern)
 * and enforces login + role redirects for Sistema Pollo.
 */
export async function updateSession(request: NextRequest) {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const { pathname } = request.nextUrl;

  const isLogin = pathname === "/login";
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);

  if (isPublicAsset) {
    return NextResponse.next();
  }

  if (!url || !publishableKey) {
    if (!isLogin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("setup", "1");
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Important: getUser() validates JWT and triggers cookie refresh via setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && isLogin) {
    return supabaseResponse;
  }

  let role: AppRole = "vendedora";
  let active = true;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role) {
      role = profile.role as AppRole;
    }
    if (profile && profile.active === false) {
      active = false;
    }
  }

  if (user && !active) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("disabled", "1");
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = homePathForRole(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && !canAccessPath(pathname, role)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = homePathForRole(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
