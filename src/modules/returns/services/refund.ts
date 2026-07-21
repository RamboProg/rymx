type QuantifiedItem = { variantId: string; quantity: number };
type ItemizedReturn = { status: string; items: QuantifiedItem[] };

// Sums returned quantity per variant across every non-rejected existing
// return for an order, then subtracts from the order's own per-variant
// quantities — mirrors shipments/services/fulfillment.ts's remainingToFulfill
// so an order can't be returned for more units than were ever shipped/sold.
export function remainingToReturn(
  orderItems: readonly QuantifiedItem[],
  existingReturns: readonly ItemizedReturn[],
): Map<string, number> {
  const returned = new Map<string, number>();
  for (const ret of existingReturns) {
    if (ret.status === "rejected") continue;
    for (const item of ret.items) {
      returned.set(item.variantId, (returned.get(item.variantId) ?? 0) + item.quantity);
    }
  }

  const remaining = new Map<string, number>();
  for (const item of orderItems) {
    remaining.set(item.variantId, item.quantity - (returned.get(item.variantId) ?? 0));
  }
  return remaining;
}

export type ReturnValidation = { ok: true } | { ok: false; error: string };

export function validateReturnItems(
  requested: readonly QuantifiedItem[],
  remaining: ReadonlyMap<string, number>,
): ReturnValidation {
  for (const item of requested) {
    const available = remaining.get(item.variantId) ?? 0;
    if (item.quantity > available) {
      return {
        ok: false,
        error: `Only ${available} unit(s) of this item are eligible for return.`,
      };
    }
  }
  return { ok: true };
}
