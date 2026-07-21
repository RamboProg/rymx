import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { auditLogEntrySchema, type AuditLogEntry } from "../schema";

// Scoped to staff/role-management actions for now — the plan's Phase 8
// "Staff & roles" bullet calls for an audit log specifically in that
// context. Retrofitting every admin action across every module into this
// log is a larger, separate effort than this pass covers.
export async function logAdminAction(
  actorUid: string,
  action: string,
  details: string,
): Promise<void> {
  await adminDb.collection("auditLog").add({
    actorUid,
    action,
    details,
    createdAt: new Date(),
  });
}

export async function listAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const snap = await adminDb.collection("auditLog").orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
    return auditLogEntrySchema.parse({ ...data, id: d.id, createdAt });
  });
}
