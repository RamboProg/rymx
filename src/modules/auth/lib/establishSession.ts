import { roleSchema } from "@/modules/rbac/schema";
import { isStaff } from "@/modules/rbac/services/permissions";

// Resolves to the landing page for the signed-in user: staff go to their admin
// dashboard, customers to their account. /api/session returns the role it read
// off the verified ID token; both destinations re-check server-side anyway.
export async function establishSession(idToken: string): Promise<string> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to establish session");

  const body = await res.json().catch(() => null);
  const role = roleSchema.catch("customer").parse((body as { role?: unknown } | null)?.role);
  return isStaff(role) ? "/admin" : "/account";
}
