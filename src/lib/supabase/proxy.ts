import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Dashboard path for a role (bare, no locale prefix — app treats these as valid). */
function dashboardForRole(role: string | undefined): string {
  return role === "admin"
    ? "/admin"
    : role === "instructor"
      ? "/instructor"
      : "/student";
}

/**
 * If a logged-in user requests an auth page (login/register), return a redirect
 * to their dashboard; otherwise return null. Auth pages are routed through the
 * i18n proxy (which skips `updateSession`), so this check must run separately in
 * `proxy()` — without it, logged-in users can open /login and its client
 * components fire parallel getUser() calls that race the single-use refresh token.
 */
export async function redirectIfAuthedOnAuthPage(
  request: NextRequest,
): Promise<NextResponse | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        // Read-only check — no cookie writes needed here.
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const url = request.nextUrl.clone();
  url.pathname = dashboardForRole(profile?.role);
  url.search = "";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Strip locale prefix (e.g. "/en/login" -> "/login") for route matching.
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/";

  // Public routes that don't require auth
  const isAuthRoute =
    pathWithoutLocale.startsWith("/login") ||
    pathWithoutLocale.startsWith("/register");
  const isCallbackRoute = pathname.startsWith("/auth/callback");
  const isInstructorSignup = pathWithoutLocale.startsWith("/instructor/signup");
  const isInstructorSignupApi = pathname.startsWith("/api/auth/instructor-signup");
  const isLegalRoute = pathWithoutLocale.startsWith("/legal");
  const isPublicRoute =
    pathWithoutLocale === "/" ||
    isAuthRoute ||
    isCallbackRoute ||
    isInstructorSignup ||
    isInstructorSignupApi ||
    isLegalRoute;

  // Not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/en/login";
    return NextResponse.redirect(url);
  }

  // Logged in and trying to access auth pages — redirect based on role.
  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = dashboardForRole(profile?.role);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
