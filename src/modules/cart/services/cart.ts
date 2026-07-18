import { CART_MAX_QUANTITY, type CartItem } from "../schema";

function sameLine(a: CartItem, b: { productId: string; variantId: string }): boolean {
  return a.productId === b.productId && a.variantId === b.variantId;
}

function clampQuantity(quantity: number): number {
  return Math.min(Math.max(quantity, 1), CART_MAX_QUANTITY);
}

export function addItem(
  items: readonly CartItem[],
  input: { productId: string; variantId: string; quantity: number },
): CartItem[] {
  const existing = items.find((i) => sameLine(i, input));
  if (!existing) {
    return [...items, { ...input, quantity: clampQuantity(input.quantity) }];
  }
  return items.map((i) =>
    sameLine(i, input) ? { ...i, quantity: clampQuantity(i.quantity + input.quantity) } : i,
  );
}

export function updateItemQuantity(
  items: readonly CartItem[],
  variantId: string,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) return items.filter((i) => i.variantId !== variantId);
  return items.map((i) =>
    i.variantId === variantId ? { ...i, quantity: clampQuantity(quantity) } : i,
  );
}

export function removeItem(items: readonly CartItem[], variantId: string): CartItem[] {
  return items.filter((i) => i.variantId !== variantId);
}

export function cartItemCount(items: readonly CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
