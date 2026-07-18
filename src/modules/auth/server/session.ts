import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

// Must match the cookie name hardcoded in src/proxy.ts (Edge runtime can't
// import this Node-only module, so the name is duplicated there).
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

export async function verifySessionCookie(cookie: string): Promise<DecodedIdToken | null> {
  try {
    return await adminAuth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

export async function ensureUserProfile(user: {
  uid: string;
  email?: string | null;
  name?: string | null;
}): Promise<void> {
  const ref = adminDb.doc(`users/${user.uid}`);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    email: user.email ?? null,
    displayName: user.name ?? null,
    role: "customer",
    createdAt: new Date().toISOString(),
  });
}
