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

// Two independent axes, deliberately not conflated:
//  - IS_DEV_SERVER: `next dev`'s Fast Refresh needs 'unsafe-eval'. `next
//    start` never does, even when it's a local build being run against
//    emulators (exactly what this project's own e2e/CI workflow does).
//  - USES_EMULATORS: whether the app is pointed at the local Firebase
//    Emulator Suite (http://127.0.0.1:*), independent of NODE_ENV — a
//    `next build && next start` run in CI/e2e is NODE_ENV=production but
//    still talks to emulators. Using NODE_ENV for this allowance broke
//    every emulator-backed login in exactly that configuration; matches the
//    same NEXT_PUBLIC_USE_FIREBASE_EMULATORS check already used for the
//    session rate limit in src/app/api/session/route.ts.
const IS_DEV_SERVER = process.env.NODE_ENV !== "production";
const USES_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

// script-src uses a per-request nonce + 'strict-dynamic': Next's own
// framework scripts pick the nonce up automatically via the header pattern
// below (no code change needed elsewhere), and any script *they* load
// inline-inserts scripts is trusted by extension under strict-dynamic. Third-
// party scripts added later (e.g. a Meta/TikTok pixel loader) must be loaded
// via next/script with this same nonce passed as its `nonce` prop, or
// strict-dynamic will silently block them.
//
// style-src keeps 'unsafe-inline': this app has exactly one inline `style`
// attribute in the whole codebase (the analytics bar-chart heights in
// src/app/admin/analytics/page.tsx) and CSP nonces don't reliably cover
// style *attributes* across browsers yet. Style-based injection is a much
// narrower attack surface than script-src, so this is the standard
// accepted tradeoff (matches Google's own strict-CSP guidance) rather than
// widening script-src instead.
function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    // Hosts listed after 'strict-dynamic' are ignored by browsers for
    // script-src (nonce/hash + strict-dynamic only). They're kept as
    // documentation of third-party script origins the app intentionally
    // loads via nonce'd next/script (Meta/TikTok) or Firebase Auth.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com https://www.gstatic.com https://connect.facebook.net https://analytics.tiktok.com${IS_DEV_SERVER ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://www.facebook.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    // Google Auth (popup + redirect) talks to accounts.google.com and
    // *.googleapis.com (identitytoolkit / securetoken). Firebase Auth also
    // loads its handler iframe from *.firebaseapp.com / *.web.app.
    `connect-src 'self' https://*.googleapis.com https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://*.web.app https://connect.facebook.net https://www.facebook.com https://analytics.tiktok.com${USES_EMULATORS ? " http://127.0.0.1:* ws://127.0.0.1:*" : ""}`,
    "frame-src https://accounts.google.com https://*.google.com https://*.firebaseapp.com https://*.web.app https://www.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
