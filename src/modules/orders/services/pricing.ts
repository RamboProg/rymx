import type { OrderItem } from "../schema";

export function computeSubtotalMinor(
  items: readonly Pick<OrderItem, "unitPriceMinor" | "quantity">[],
): number {
  return items.reduce((sum, i) => sum + i.unitPriceMinor * i.quantity, 0);
}

// Taxed on the discounted subtotal, before shipping/COD fee — the simplest
// defensible base for a single flat store-wide rate (settings module owns
// `taxPercent`; this just does the rounding).
export function computeTaxMinor(discountedSubtotalMinor: number, taxPercent: number): number {
  return Math.round((discountedSubtotalMinor * taxPercent) / 100);
}

export function computeTotalMinor(params: {
  subtotalMinor: number;
  discountMinor: number;
  shippingFeeMinor: number;
  taxMinor: number;
  codFeeMinor: number;
}): number {
  const discounted = Math.max(0, params.subtotalMinor - params.discountMinor);
  return discounted + params.shippingFeeMinor + params.taxMinor + params.codFeeMinor;
}
