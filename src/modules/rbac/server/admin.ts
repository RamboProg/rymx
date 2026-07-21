import "server-only";

import { adminAuth } from "@/lib/firebase/admin";
import {
  staffMemberSchema,
  type Claims,
  type Permission,
  type Role,
  type StaffMember,
} from "../schema";

// Every non-customer Auth user (role set via custom claims). Admin-scale:
// fine while staff headcount is small, same tradeoff as every other admin
// listing in this codebase.
export async function listStaffUsers(): Promise<StaffMember[]> {
  const staff: StaffMember[] = [];
  let pageToken: string | undefined;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const claims = user.customClaims as Partial<Claims> | undefined;
      if (!claims?.role || claims.role === "customer") continue;
      staff.push(
        staffMemberSchema.parse({
          uid: user.uid,
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          role: claims.role,
          permissions: claims.permissions ?? [],
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : null,
        }),
      );
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return staff;
}

export async function getStaffMember(uid: string): Promise<StaffMember | null> {
  const user = await adminAuth.getUser(uid).catch(() => null);
  if (!user) return null;
  const claims = user.customClaims as Partial<Claims> | undefined;
  if (!claims?.role || claims.role === "customer") return null;
  return staffMemberSchema.parse({
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    role: claims.role,
    permissions: claims.permissions ?? [],
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : null,
  });
}

export function generateTempPassword(): string {
  // Not meant to be memorable — the invite email tells the recipient to
  // reset it immediately via the normal "forgot password" flow.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function setStaffClaims(
  uid: string,
  role: Role,
  permissions: Permission[],
): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, { role, permissions });
}
