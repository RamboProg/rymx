import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionCookie } from "@/modules/auth/server/session";
import { claimsSchema, type Permission } from "../schema";
import { hasPermission } from "../services/permissions";

export type SessionClaims = {
  uid: string;
  email: string | null;
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

  return { uid: decoded.uid, email: decoded.email ?? null, ...parsed.data };
}

export async function requirePermission(permission: Permission): Promise<SessionClaims> {
  const claims = await getSessionClaims();
  if (!hasPermission(claims, permission)) {
    throw new Error("Forbidden");
  }
  return claims!;
}
