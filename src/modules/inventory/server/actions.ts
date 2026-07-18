"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import { adjustStockInputSchema } from "../schema";
import { computeAdjustedStock } from "../services/adjustment";

export type AdjustStockResult = { ok: true; newStock: number } | { ok: false; error: string };

export async function adjustStockAction(rawInput: unknown): Promise<AdjustStockResult> {
  const claims = await getSessionClaims();
  if (!hasPermission(claims, "products:write")) return { ok: false, error: "Forbidden" };

  const parsed = adjustStockInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { productId, variantId, delta, reason } = parsed.data;

  try {
    const newStock = await adminDb.runTransaction(async (tx) => {
      const productRef = adminDb.doc(`products/${productId}`);
      const variantRef = adminDb.doc(`products/${productId}/variants/${variantId}`);
      const [productSnap, variantSnap] = await Promise.all([
        tx.get(productRef),
        tx.get(variantRef),
      ]);

      if (!productSnap.exists || !variantSnap.exists) throw new Error("Variant not found.");

      const currentStock = variantSnap.data()!.stock as number;
      const adjusted = computeAdjustedStock(currentStock, delta);
      if (!adjusted.ok) throw new Error(adjusted.error);
      const next = adjusted.newStock;

      tx.update(variantRef, { stock: next });
      tx.set(adminDb.collection("inventoryAdjustments").doc(), {
        productId,
        productTitle: productSnap.data()!.title as string,
        variantId,
        sku: variantSnap.data()!.sku as string,
        delta,
        newStock: next,
        reason,
        staffUid: claims!.uid,
        createdAt: new Date(),
      });

      return next;
    });

    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true, newStock };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to adjust stock" };
  }
}
