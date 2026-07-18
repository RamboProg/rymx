import type { OrderItem } from "../schema";

// Flat COD shipping fee, EGP 50. Revisit with rate tables per governorate
// once carrier integration exists.
export const FLAT_SHIPPING_FEE_MINOR = 5000;
export const FREE_SHIPPING_THRESHOLD_MINOR = 300000;

export function computeSubtotalMinor(
  items: readonly Pick<OrderItem, "unitPriceMinor" | "quantity">[],
): number {
  return items.reduce((sum, i) => sum + i.unitPriceMinor * i.quantity, 0);
}

export function computeShippingFeeMinor(subtotalMinor: number): number {
  return subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : FLAT_SHIPPING_FEE_MINOR;
}

export function computeTotalMinor(params: {
  subtotalMinor: number;
  discountMinor: number;
  shippingFeeMinor: number;
}): number {
  const discounted = Math.max(0, params.subtotalMinor - params.discountMinor);
  return discounted + params.shippingFeeMinor;
}
