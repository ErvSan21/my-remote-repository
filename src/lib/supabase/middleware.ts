import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchProfileRow } from "@/lib/auth/profile-row";
import { canAccessPath, homePathForRole } from "@/lib/auth/permissions";
import { safeInternalPath } from "@/lib/auth/redirects";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function applySession(
  response: NextResponse,
  cookies: PendingCookie[],
  headers: Record<string, string>,
) {
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Refreshes the auth session cookies (official @supabase/ssr pattern)
 * and enforces login + role redirects for MAC.
 * Used by src/proxy.ts (Next.js 16 proxy; formerly middleware).
 */
export async function updateSession(request: NextRequest) {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const { pathname } = request.nextUrl;

  const isLogin = isLoginPath(pathname);
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname);

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // Health check always public (no secrets returned)
  if (pathname === "/api/health/env") {
    return NextResponse.next();
  }

  if (!url || !publishableKey) {
    if (!isLogin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("setup", "1");
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const pendingCookies: PendingCookie[] = [];
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach((cookie) => {
          const index = pendingCookies.findIndex((item) => item.name === cookie.name);
          if (index >= 0) pendingCookies.splice(index, 1);
          pendingCookies.push(cookie);
        });
        Object.assign(cacheHeaders, headers);
        supabaseResponse = NextResponse.next({ request });
        applySession(supabaseResponse, pendingCookies, cacheHeaders);
      },
    },
  });

  const redirectTo = (path: string, params: Record<string, string | null>) => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = path;
    redirectUrl.search = "";
    Object.entries(params).forEach(([key, value]) => {
      if (value) redirectUrl.searchParams.set(key, value);
    });
    return applySession(NextResponse.redirect(redirectUrl), pendingCookies, cacheHeaders);
  };

  // Important: getUser() validates JWT and triggers cookie refresh via setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    return redirectTo("/login", { next: safeInternalPath(pathname) });
  }

  if (!user && isLogin) {
    if (request.nextUrl.searchParams.get("setup") === "1") {
      return redirectTo("/login", {});
    }
    return supabaseResponse;
  }

  const { profile } = await fetchProfileRow((columns) =>
    supabase.from("profiles").select(columns).eq("id", user!.id).maybeSingle(),
  );

  const role = profile?.role ?? null;
  const active = Boolean(profile && profile.active && role);

  if (!active || !role || !profile) {
    await supabase.auth.signOut();
    return redirectTo("/login", {
      disabled: profile && profile.active === false ? "1" : null,
    });
  }

  const modules = profile.enabled_modules;
  const home = homePathForRole(role, modules);

  if (profile.must_change_password && pathname !== "/cambiar-contrasena") {
    return redirectTo("/cambiar-contrasena", {});
  }

  if (!profile.must_change_password && pathname === "/cambiar-contrasena") {
    return redirectTo(home, {});
  }

  if (isLogin) {
    return redirectTo(home, {});
  }

  if (!canAccessPath(pathname, role, modules)) {
    return redirectTo(home, {});
  }

  return supabaseResponse;
}
