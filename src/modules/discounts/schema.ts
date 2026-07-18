import { z } from "zod";

export const discountTypeSchema = z.enum(["percent", "fixed"]);
export type DiscountType = z.infer<typeof discountTypeSchema>;

// The document id in Firestore is the uppercased code itself — checkout needs
// a direct doc lookup (not a query) so it can be re-read inside a transaction.
export const discountSchema = z.object({
  code: z.string().min(1),
  type: discountTypeSchema,
  // percent: 1-100. fixed: minor units (piastres).
  value: z.number().int().positive(),
  minSpendMinor: z.number().int().nonnegative().default(0),
  startsAt: z.date().nullable().default(null),
  endsAt: z.date().nullable().default(null),
  // Total redemptions allowed across all customers; null = unlimited.
  usageLimit: z.number().int().positive().nullable().default(null),
  redeemedCount: z.number().int().nonnegative().default(0),
  // Redemptions allowed per customer; 1 = single-use per person (the plan's default).
  perUserLimit: z.number().int().positive().default(1),
  // Empty arrays mean "no scoping restriction" on that dimension.
  productIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});
export type Discount = z.infer<typeof discountSchema>;

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

// Identity used to enforce per-user single-use: signed-in customers are keyed
// by uid, guests by their normalized checkout email (best-effort — a guest
// can dodge this with a new email, same as most COD storefronts accept).
export function discountRedemptionId(code: string, identity: string): string {
  return `${normalizeDiscountCode(code)}__${identity.trim().toLowerCase()}`;
}
