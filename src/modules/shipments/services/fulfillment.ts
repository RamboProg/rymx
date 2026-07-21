type QuantifiedItem = { variantId: string; quantity: number };
type ItemizedShipment = { status: string; items: QuantifiedItem[] };

// Sums shipped quantity per variant across every existing shipment for an
// order, then subtracts from the order's own per-variant quantities — what's
// left is what a new shipment is still allowed to claim.
export function remainingToFulfill(
  orderItems: readonly QuantifiedItem[],
  existingShipments: readonly ItemizedShipment[],
): Map<string, number> {
  const shipped = new Map<string, number>();
  for (const shipment of existingShipments) {
    for (const item of shipment.items) {
      shipped.set(item.variantId, (shipped.get(item.variantId) ?? 0) + item.quantity);
    }
  }

  const remaining = new Map<string, number>();
  for (const item of orderItems) {
    remaining.set(item.variantId, item.quantity - (shipped.get(item.variantId) ?? 0));
  }
  return remaining;
}

export type ShipmentValidation = { ok: true } | { ok: false; error: string };

export function validateShipmentItems(
  requested: readonly QuantifiedItem[],
  remaining: ReadonlyMap<string, number>,
): ShipmentValidation {
  for (const item of requested) {
    const available = remaining.get(item.variantId) ?? 0;
    if (item.quantity > available) {
      return { ok: false, error: `Only ${available} unit(s) of this item remain unfulfilled.` };
    }
  }
  return { ok: true };
}

// An order counts as fully delivered once every shipment covering it has
// been delivered and, together, they cover the order's full quantity of
// every line item (guards against a still-pending shipment silently being
// ignored).
export function isOrderFullyDelivered(
  orderItems: readonly QuantifiedItem[],
  shipments: readonly ItemizedShipment[],
): boolean {
  if (shipments.length === 0) return false;
  if (shipments.some((s) => s.status !== "delivered")) return false;

  const delivered = new Map<string, number>();
  for (const shipment of shipments) {
    for (const item of shipment.items) {
      delivered.set(item.variantId, (delivered.get(item.variantId) ?? 0) + item.quantity);
    }
  }
  return orderItems.every((item) => (delivered.get(item.variantId) ?? 0) >= item.quantity);
}
