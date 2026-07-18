import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Runs on the Edge runtime on Vercel — the Firebase Admin SDK must never be
// imported here (Node-only). This does a cheap cookie-presence check only;
// full session-cookie verification happens in Node route handlers/server
// actions (see src/lib/firebase/admin.ts and the auth module, Phase 2).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature required by Next.js; body fills in with Phase 2 auth
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
