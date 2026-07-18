import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Runs on the Edge runtime on Vercel — the Firebase Admin SDK must never be
// imported here (Node-only). This does a cheap cookie-presence check only;
// full session-cookie verification happens in Node route handlers/server
// actions (see src/modules/auth/server/session.ts and src/modules/rbac/server).
//
// Must match SESSION_COOKIE in src/modules/auth/server/session.ts.
const SESSION_COOKIE = "__session";
const PROTECTED_PREFIXES = ["/admin", "/account"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
