import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { updateSession, redirectIfAuthedOnAuthPage } from "@/lib/supabase/proxy";
import { routing } from "@/i18n/routing";

const intlProxy = createIntlMiddleware(routing);

// Public surfaces that need locale routing (home, legal, auth pages).
// Everything else (instructor/student/admin app, API, auth callbacks) skips i18n.
const PUBLIC_LOCALIZED_PATTERNS = [
  /^\/(en|fr)?$/,
  /^(?:\/(en|fr))?\/(login|register|legal)(\/|$)/,
];

// Auth pages a logged-in user should be redirected away from (any locale prefix).
const AUTH_PATH_PATTERN = /^(?:\/(en|fr))?\/(login|register)(\/|$)/;

function isPublicLocalizedPath(pathname: string): boolean {
  return PUBLIC_LOCALIZED_PATTERNS.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPublicLocalizedPath(pathname)) {
    // Auth pages route through i18n (skipping updateSession), so the
    // "already logged in → dashboard" redirect must run here explicitly.
    if (AUTH_PATH_PATTERN.test(pathname)) {
      const redirect = await redirectIfAuthedOnAuthPage(request);
      if (redirect) return redirect;
    }
    return intlProxy(request);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - Public image/font/media files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|mp4|webm|ogg|mov|mp3|wav)$).*)",
  ],
};
