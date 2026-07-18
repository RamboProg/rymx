import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { getProductById, getVariantById } from "@/modules/catalog/server";
import { cartItemSchema, type CartItem, type ResolvedCart, type ResolvedCartLine } from "../schema";

export async function getCart(uid: string): Promise<CartItem[]> {
  const doc = await adminDb.doc(`carts/${uid}`).get();
  if (!doc.exists) return [];
  const items = doc.data()?.items ?? [];
  return cartItemSchema.array().parse(items);
}

export async function saveCart(uid: string, items: readonly CartItem[]): Promise<void> {
  await adminDb.doc(`carts/${uid}`).set({ items, updatedAt: new Date() });
}

export async function clearCart(uid: string): Promise<void> {
  await adminDb.doc(`carts/${uid}`).delete();
}

// The source of truth for cart pricing/availability. Never trust a client-sent
// price — every line is re-priced against the live product/variant on every
// call, and unavailable lines are dropped (with a reported issue) rather than
// silently kept.
export async function resolveCartItems(items: readonly CartItem[]): Promise<ResolvedCart> {
  const lines: ResolvedCartLine[] = [];
  const issues: string[] = [];

  for (const item of items) {
    const [product, variant] = await Promise.all([
      getProductById(item.productId),
      getVariantById(item.productId, item.variantId),
    ]);

    if (!product || !variant) {
      issues.push("An item in your cart is no longer available and was removed.");
      continue;
    }
    if (product.status !== "active") {
      issues.push(`${product.title} is no longer available and was removed.`);
      continue;
    }

    const quantity = Math.min(item.quantity, variant.stock);
    if (quantity <= 0) {
      issues.push(`${product.title} is out of stock and was removed.`);
      continue;
    }
    if (quantity < item.quantity) {
      issues.push(`${product.title} quantity was reduced to ${quantity} (limited stock).`);
    }

    lines.push({
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      title: product.title,
      slug: product.slug,
      image: product.media[0]?.url ?? null,
      optionValues: variant.optionValues,
      quantity,
      unitPriceMinor: variant.priceMinor,
      lineTotalMinor: variant.priceMinor * quantity,
      stock: variant.stock,
      available: true,
    });
  }

  const subtotalMinor = lines.reduce((sum, l) => sum + l.lineTotalMinor, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  return { lines, subtotalMinor, itemCount, issues };
}
