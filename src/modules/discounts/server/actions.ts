"use server";

import { z } from "zod";
import { resolveCartItems } from "@/modules/cart/server";
import { cartItemSchema } from "@/modules/cart/schema";
import { getSessionClaims } from "@/modules/rbac/server";
import { normalizeDiscountCode } from "../schema";
import {
  computeDiscountMinor,
  discountIneligibleMessage,
  validateDiscountEligibility,
} from "../services/discount";
import { getDiscountByCode, getRedemptionCount, resolveCollectionProductIds } from "./index";

const previewInputSchema = z.object({
  code: z.string().trim().min(1),
  items: cartItemSchema.array().min(1),
  guestEmail: z.email().optional(),
});

export type PreviewDiscountResult =
  { ok: true; code: string; discountMinor: number } | { ok: false; error: string };

// Preview-only: never mutates redemption counts. The checkout transaction is
// the sole place a discount is actually applied and recorded — this exists
// purely so /checkout can show an accurate total before the customer submits.
export async function previewDiscountAction(rawInput: unknown): Promise<PreviewDiscountResult> {
  const parsed = previewInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const claims = await getSessionClaims();
  const identity = claims?.uid ?? parsed.data.guestEmail;
  if (!identity) return { ok: false, error: "Enter your email to use a promo code." };

  const discount = await getDiscountByCode(parsed.data.code);
  if (!discount) return { ok: false, error: "Invalid promo code." };

  const { lines, subtotalMinor } = await resolveCartItems(parsed.data.items);
  const [redemptionCount, collectionProductIds] = await Promise.all([
    getRedemptionCount(normalizeDiscountCode(parsed.data.code), identity),
    resolveCollectionProductIds(discount.collectionIds),
  ]);

  const eligibility = validateDiscountEligibility({
    discount,
    now: new Date(),
    subtotalMinor,
    redemptionCount,
    cartProductIds: new Set(lines.map((l) => l.productId)),
    collectionProductIds,
  });
  if (!eligibility.ok) return { ok: false, error: discountIneligibleMessage(eligibility.reason) };

  return {
    ok: true,
    code: discount.code,
    discountMinor: computeDiscountMinor(subtotalMinor, discount),
  };
}
