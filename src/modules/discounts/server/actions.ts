"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveCartItems } from "@/modules/cart/server";
import { cartItemSchema } from "@/modules/cart/schema";
import { sendPromoCodeEmail } from "@/modules/notifications/server";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import {
  bulkGenerateCodesInputSchema,
  discountInputSchema,
  discountSchema,
  normalizeDiscountCode,
  type Discount,
} from "../schema";
import { generateBulkCodes } from "../services/codegen";
import {
  computeDiscountMinor,
  discountIneligibleMessage,
  validateDiscountEligibility,
} from "../services/discount";
import { getDiscountByCode, getRedemptionCount, resolveCollectionProductIds } from "./index";
import { createDiscountDoc, listAllDiscountCodes, updateDiscountDoc } from "./admin";

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
    identity,
  });
  if (!eligibility.ok) return { ok: false, error: discountIneligibleMessage(eligibility.reason) };

  return {
    ok: true,
    code: discount.code,
    discountMinor: computeDiscountMinor(subtotalMinor, discount),
  };
}

async function requireDiscountsManage(): Promise<boolean> {
  const claims = await getSessionClaims();
  return hasPermission(claims, "discounts:manage");
}

export type DiscountActionResult = { ok: true; discount: Discount } | { ok: false; error: string };

export async function createDiscountAction(rawInput: unknown): Promise<DiscountActionResult> {
  if (!(await requireDiscountsManage())) return { ok: false, error: "Forbidden" };

  const parsed = discountInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { notifyEmail, ...input } = parsed.data;

  const discount = discountSchema.parse({
    ...input,
    code: normalizeDiscountCode(input.code),
    redeemedCount: 0,
  });

  try {
    await createDiscountDoc(discount);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create discount." };
  }

  if (notifyEmail && discount.assignedToUid) {
    await sendPromoCodeEmail({
      to: notifyEmail,
      code: discount.code,
      description:
        discount.type === "percent"
          ? `${discount.value}% off your next order.`
          : `A fixed discount on your next order.`,
    });
  }

  revalidatePath("/admin/discounts");
  return { ok: true, discount };
}

export async function updateDiscountAction(rawInput: unknown): Promise<DiscountActionResult> {
  if (!(await requireDiscountsManage())) return { ok: false, error: "Forbidden" };

  const parsed = discountInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { code } = parsed.data;
  const rest = {
    type: parsed.data.type,
    value: parsed.data.value,
    minSpendMinor: parsed.data.minSpendMinor,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    usageLimit: parsed.data.usageLimit,
    perUserLimit: parsed.data.perUserLimit,
    productIds: parsed.data.productIds,
    collectionIds: parsed.data.collectionIds,
    active: parsed.data.active,
    assignedToUid: parsed.data.assignedToUid,
  };

  const existing = await getDiscountByCode(code);
  if (!existing) return { ok: false, error: "Discount not found." };

  await updateDiscountDoc(code, rest);
  revalidatePath("/admin/discounts");
  revalidatePath(`/admin/discounts/${normalizeDiscountCode(code)}`);
  return { ok: true, discount: { ...existing, ...rest } };
}

export type SetDiscountActiveResult = { ok: true } | { ok: false; error: string };

export async function setDiscountActiveAction(
  code: string,
  active: boolean,
): Promise<SetDiscountActiveResult> {
  if (!(await requireDiscountsManage())) return { ok: false, error: "Forbidden" };

  const existing = await getDiscountByCode(code);
  if (!existing) return { ok: false, error: "Discount not found." };

  await updateDiscountDoc(code, { active });
  revalidatePath("/admin/discounts");
  return { ok: true };
}

export type BulkGenerateCodesResult = { ok: true; codes: string[] } | { ok: false; error: string };

// Creates `count` public single-use-per-customer codes sharing the same
// value/min-spend/expiry, for handing out in bulk (e.g. an influencer drop).
// Personal (assignedToUid) codes are issued one at a time via
// createDiscountAction instead — bulk codes are never assigned to a uid.
export async function bulkGenerateCodesAction(rawInput: unknown): Promise<BulkGenerateCodesResult> {
  if (!(await requireDiscountsManage())) return { ok: false, error: "Forbidden" };

  const parsed = bulkGenerateCodesInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { prefix, count, type, value, minSpendMinor, endsAt, perUserLimit } = parsed.data;

  const existingCodes = await listAllDiscountCodes();
  const codes = generateBulkCodes(prefix, count, existingCodes);

  await Promise.all(
    codes.map((code) =>
      createDiscountDoc(
        discountSchema.parse({
          code,
          type,
          value,
          minSpendMinor,
          endsAt,
          perUserLimit,
          usageLimit: 1,
          redeemedCount: 0,
          active: true,
          assignedToUid: null,
        }),
      ),
    ),
  );

  revalidatePath("/admin/discounts");
  return { ok: true, codes };
}
