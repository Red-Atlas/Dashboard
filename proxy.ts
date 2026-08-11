import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isSessionTokenValid } from "@/lib/auth";

// Renamed from middleware.ts: Next.js 16 deprecates the `middleware`
// convention in favour of `proxy`, which always runs on the Node.js runtime.

/** Paths reachable without a session. */
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
]);

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    // Someone already signed in shouldn't sit on the login screen.
    if (
      pathname === "/login" &&
      (await isSessionTokenValid(request.cookies.get(SESSION_COOKIE)?.value))
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const authenticated = await isSessionTokenValid(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!authenticated) {
    // API callers get a status they can act on; humans get the login page.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, the favicon and the public sound files.
     * Skipping these keeps the proxy off the hot path for cacheable files.
     */
    "/((?!_next/static|_next/image|favicon.svg|robots.txt|sounds/|red-atlas-logo).*)",
  ],
};
