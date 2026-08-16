"use server";

import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import { checkAdminMutationRateLimit } from "@/lib/security/rateLimit";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import { adjustStockInputSchema } from "../schema";
import { applyStockDeltaInTransaction } from "./index";

export type AdjustStockResult = { ok: true; newStock: number } | { ok: false; error: string };

export async function adjustStockAction(rawInput: unknown): Promise<AdjustStockResult> {
  const claims = await getSessionClaims();
  if (!hasPermission(claims, "products:write")) return { ok: false, error: "Forbidden" };
  if (!checkAdminMutationRateLimit(claims!.uid)) {
    return { ok: false, error: "Too many requests. Try again shortly." };
  }

  const parsed = adjustStockInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { productId, variantId, delta, reason } = parsed.data;

  try {
    const newStock = await adminDb.runTransaction((tx) =>
      applyStockDeltaInTransaction(tx, {
        productId,
        variantId,
        delta,
        reason,
        staffUid: claims!.uid,
      }),
    );

    invalidateCacheTags(CACHE_TAGS.inventory, CACHE_TAGS.products);
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true, newStock };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to adjust stock" };
  }
}
