import type { Discount } from "../schema";

export type DiscountIneligibleReason =
  | "inactive"
  | "not-started"
  | "expired"
  | "below-min-spend"
  | "usage-limit-reached"
  | "already-used"
  | "not-applicable";

export type DiscountEligibility = { ok: true } | { ok: false; reason: DiscountIneligibleReason };

export function computeDiscountMinor(subtotalMinor: number, discount: Discount): number {
  const raw =
    discount.type === "percent"
      ? Math.floor((subtotalMinor * discount.value) / 100)
      : discount.value;
  return Math.max(0, Math.min(raw, subtotalMinor));
}

export function isDiscountWindowActive(
  discount: Pick<Discount, "startsAt" | "endsAt">,
  now: Date,
): boolean {
  if (discount.startsAt && now < discount.startsAt) return false;
  if (discount.endsAt && now > discount.endsAt) return false;
  return true;
}

export function isDiscountApplicableToCart(
  discount: Pick<Discount, "productIds" | "collectionIds">,
  cartProductIds: ReadonlySet<string>,
  collectionProductIds: ReadonlySet<string>,
): boolean {
  if (discount.productIds.length === 0 && discount.collectionIds.length === 0) return true;
  for (const id of cartProductIds) {
    if (discount.productIds.includes(id) || collectionProductIds.has(id)) return true;
  }
  return false;
}

export function discountIneligibleMessage(reason: DiscountIneligibleReason): string {
  switch (reason) {
    case "inactive":
      return "This promo code is no longer active.";
    case "not-started":
      return "This promo code isn't active yet.";
    case "expired":
      return "This promo code has expired.";
    case "below-min-spend":
      return "Your order doesn't meet this code's minimum spend.";
    case "usage-limit-reached":
      return "This promo code has reached its usage limit.";
    case "already-used":
      return "You've already used this promo code.";
    case "not-applicable":
      return "This promo code doesn't apply to the items in your cart.";
  }
}

export function validateDiscountEligibility(params: {
  discount: Discount;
  now: Date;
  subtotalMinor: number;
  redemptionCount: number;
  cartProductIds: ReadonlySet<string>;
  collectionProductIds: ReadonlySet<string>;
}): DiscountEligibility {
  const { discount, now, subtotalMinor, redemptionCount, cartProductIds, collectionProductIds } =
    params;

  if (!discount.active) return { ok: false, reason: "inactive" };
  if (discount.startsAt && now < discount.startsAt) return { ok: false, reason: "not-started" };
  if (discount.endsAt && now > discount.endsAt) return { ok: false, reason: "expired" };
  if (subtotalMinor < discount.minSpendMinor) return { ok: false, reason: "below-min-spend" };
  if (discount.usageLimit !== null && discount.redeemedCount >= discount.usageLimit) {
    return { ok: false, reason: "usage-limit-reached" };
  }
  if (redemptionCount >= discount.perUserLimit) return { ok: false, reason: "already-used" };
  if (!isDiscountApplicableToCart(discount, cartProductIds, collectionProductIds)) {
    return { ok: false, reason: "not-applicable" };
  }
  return { ok: true };
}
