import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { checkRateLimit, requestIp } from "@/lib/security/rateLimit";
import {
  createSessionCookie,
  ensureUserProfile,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from "@/modules/auth/server/session";
import { roleSchema } from "@/modules/rbac/schema";

export const runtime = "nodejs";

const bodySchema = z.object({ idToken: z.string().min(1) });

function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";

  const origin = request.headers.get("origin");
  if (!origin) return true; // no Origin header at all: not a browser cross-site request
  return origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
  }

  // Emulator-backed runs (local dev, e2e/CI) share one IP across dozens of
  // legitimate test logins within minutes — a real brute-force concern in
  // production, not here. This never relaxes the limit in production, since
  // NEXT_PUBLIC_USE_FIREBASE_EMULATORS is never set on a deployed environment.
  const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  if (!checkRateLimit(`session:${requestIp(request)}`, isEmulator ? 60 : 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(parsed.data.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }

  await ensureUserProfile({ uid: decoded.uid, email: decoded.email, name: decoded.name });
  const sessionCookie = await createSessionCookie(parsed.data.idToken);

  // Echo the caller's role so the sign-in form can send staff straight to
  // /admin and customers to /account. Authoritative gating still happens
  // server-side in each layout — this is only a routing hint.
  const role = roleSchema.catch("customer").parse(decoded.role);

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
