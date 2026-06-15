import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    url.pathname =
      profile?.role === "admin"
        ? "/admin"
        : profile?.role === "instructor"
          ? "/instructor"
          : "/student";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
