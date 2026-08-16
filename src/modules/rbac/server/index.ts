import "server-only";

import { cookies } from "next/headers";
import { checkAdminMutationRateLimit } from "@/lib/security/rateLimit";
import { SESSION_COOKIE, verifySessionCookie } from "@/modules/auth/server/session";
import { claimsSchema, type Permission } from "../schema";
import { hasPermission } from "../services/permissions";

export type SessionClaims = {
  uid: string;
  email: string | null;
  // Sourced from the Admin-SDK-verified session cookie's `email_verified`
  // claim (server-trusted, never client input) — used only to show the
  // /account nag banner; verification is never gated on it.
  emailVerified: boolean;
} & import("../schema").Claims;

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  const decoded = await verifySessionCookie(cookie);
  if (!decoded) return null;

  const parsed = claimsSchema.safeParse({
    role: decoded.role ?? "customer",
    permissions: decoded.permissions ?? [],
  });
  if (!parsed.success) return null;

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false,
    ...parsed.data,
  };
}

// Shared by every module's per-action gate (`requireXxxWrite`, `requireXxxManage`,
// etc.): checks the caller holds `permission`, then rate-limits the mutation.
// Each module keeps its own thin, named wrapper around this so call sites read
// `requireCollectionsWrite()` rather than `requireAdminPermission("collections:write")`.
export async function requireAdminPermission(
  permission: Permission,
): Promise<SessionClaims | null> {
  const claims = await getSessionClaims();
  if (!hasPermission(claims, permission)) return null;
  return checkAdminMutationRateLimit(claims!.uid) ? claims : null;
}
