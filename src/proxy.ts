import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { updateSession } from "@/lib/supabase/proxy";
import { routing } from "@/i18n/routing";

const intlProxy = createIntlMiddleware(routing);

// Public surfaces that need locale routing (home, legal, auth pages).
// Everything else (instructor/student/admin app, API, auth callbacks) skips i18n.
const PUBLIC_LOCALIZED_PATTERNS = [
  /^\/(en|fr)?$/,
  /^(?:\/(en|fr))?\/(login|register|legal)(\/|$)/,
];

function isPublicLocalizedPath(pathname: string): boolean {
  return PUBLIC_LOCALIZED_PATTERNS.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (isPublicLocalizedPath(request.nextUrl.pathname)) {
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
