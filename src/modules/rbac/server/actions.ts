"use server";

import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendStaffInviteEmail } from "@/modules/notifications/server";
import { inviteStaffInputSchema, updateStaffRoleInputSchema, type StaffMember } from "../schema";
import { generateTempPassword, getStaffMember, setStaffClaims } from "./admin";
import { logAdminAction } from "./audit";
import { hasPermission } from "../services/permissions";
import { getSessionClaims } from "./index";

async function requireStaffManage() {
  const claims = await getSessionClaims();
  if (!hasPermission(claims, "staff:manage")) return null;
  return claims!;
}

export type StaffActionResult = { ok: true; member: StaffMember } | { ok: false; error: string };

export async function inviteStaffAction(rawInput: unknown): Promise<StaffActionResult> {
  const actor = await requireStaffManage();
  if (!actor) return { ok: false, error: "Forbidden" };

  const parsed = inviteStaffInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { email, displayName, role, permissions } = parsed.data;

  // Granting "owner" is the one privilege escalation an "admin" with
  // staff:manage could otherwise reach for (admins have every other
  // permission by default) — only an existing owner may create another one.
  if ((role as string) === "owner" && actor.role !== "owner") {
    return { ok: false, error: "Only an owner can grant the owner role." };
  }

  const tempPassword = generateTempPassword();
  let uid: string;
  try {
    const created = await adminAuth.createUser({ email, password: tempPassword, displayName });
    uid = created.uid;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create the staff account.";
    return { ok: false, error: message };
  }

  await setStaffClaims(uid, role, permissions);
  await adminDb.doc(`users/${uid}`).set({
    email,
    displayName,
    role,
    createdAt: new Date().toISOString(),
  });
  await sendStaffInviteEmail({ to: email, tempPassword, role });
  await logAdminAction(actor.uid, "staff.invite", `Invited ${email} as ${role}`);

  revalidatePath("/admin/staff");
  const member = await getStaffMember(uid);
  return { ok: true, member: member! };
}

export async function updateStaffRoleAction(rawInput: unknown): Promise<StaffActionResult> {
  const actor = await requireStaffManage();
  if (!actor) return { ok: false, error: "Forbidden" };

  const parsed = updateStaffRoleInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { uid, role, permissions } = parsed.data;

  if (uid === actor.uid) {
    return { ok: false, error: "You can't change your own role — ask another owner or admin." };
  }
  if (role === "owner" && actor.role !== "owner") {
    return { ok: false, error: "Only an owner can grant the owner role." };
  }

  const existing = await getStaffMember(uid);
  if (!existing) return { ok: false, error: "Staff member not found." };

  await setStaffClaims(uid, role, permissions);
  await adminDb.doc(`users/${uid}`).set({ role }, { merge: true });
  const roleChanged = existing.role !== role;
  const permissionsChanged =
    existing.permissions.length !== permissions.length ||
    existing.permissions.some((p) => !permissions.includes(p));
  const changeSummary = [
    roleChanged ? `role ${existing.role} → ${role}` : null,
    permissionsChanged
      ? `permissions [${existing.permissions.join(", ")}] → [${permissions.join(", ")}]`
      : null,
  ]
    .filter(Boolean)
    .join("; ");
  await logAdminAction(
    actor.uid,
    "staff.role_change",
    `${existing.email ?? uid}: ${changeSummary || "no change"}`,
  );

  revalidatePath("/admin/staff");
  const member = await getStaffMember(uid);
  return { ok: true, member: member! };
}

export type RevokeStaffResult = { ok: true } | { ok: false; error: string };

// Revokes admin access entirely (reverts to a plain customer) rather than
// deleting the Auth account — the person may still have order history worth
// keeping attached to their uid.
export async function revokeStaffAction(uid: string): Promise<RevokeStaffResult> {
  const actor = await requireStaffManage();
  if (!actor) return { ok: false, error: "Forbidden" };

  if (uid === actor.uid) {
    return { ok: false, error: "You can't revoke your own access — ask another owner or admin." };
  }

  const existing = await getStaffMember(uid);
  if (!existing) return { ok: false, error: "Staff member not found." };
  if (existing.role === "owner" && actor.role !== "owner") {
    return { ok: false, error: "Only an owner can revoke another owner." };
  }

  await setStaffClaims(uid, "customer", []);
  await adminDb.doc(`users/${uid}`).set({ role: "customer" }, { merge: true });
  await logAdminAction(
    actor.uid,
    "staff.revoke",
    `Revoked staff access for ${existing.email ?? uid}`,
  );

  revalidatePath("/admin/staff");
  return { ok: true };
}
