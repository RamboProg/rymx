"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { checkAdminMutationRateLimit } from "@/lib/security/rateLimit";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import { contentSettingsSchema } from "../schema";

export type ContentActionResult = { ok: true } | { ok: false; error: string };

export async function updateContentSettingsAction(rawInput: unknown): Promise<ContentActionResult> {
  const claims = await getSessionClaims();
  // Content editing is settings-level access — no dedicated "content:manage"
  // permission exists, and adding one would mean every prior staff invite's
  // permission set silently excludes it. Reuses settings:manage instead.
  if (!hasPermission(claims, "settings:manage")) return { ok: false, error: "Forbidden" };
  if (!checkAdminMutationRateLimit(claims!.uid)) {
    return { ok: false, error: "Too many requests. Try again shortly." };
  }

  const parsed = contentSettingsSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.doc("content/homepage").set(parsed.data);
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true };
}
