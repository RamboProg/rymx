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
  // Set = a personal code issued to exactly one customer (shown on their
  // /account page); null = a public code anyone can redeem.
  assignedToUid: z.string().nullable().default(null),
});
export type Discount = z.infer<typeof discountSchema>;

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

// What the admin create/edit form submits. `code` is immutable once created
// (it's the Firestore doc id) — the edit form only ever calls this with the
// existing code and updates every other field.
export const discountInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code must be at least 3 characters")
    .max(24, "Code must be at most 24 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Only letters, numbers, and hyphens"),
  type: discountTypeSchema,
  value: z.number().int().positive(),
  minSpendMinor: z.number().int().nonnegative().default(0),
  startsAt: z.date().nullable().default(null),
  endsAt: z.date().nullable().default(null),
  usageLimit: z.number().int().positive().nullable().default(null),
  perUserLimit: z.number().int().positive().default(1),
  productIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  assignedToUid: z.string().trim().min(1).nullable().default(null),
  // Not persisted on the discount doc — when set, the create action sends
  // the code to this address via the notifications module. Only meaningful
  // for a personal (assignedToUid) code.
  notifyEmail: z.email().optional(),
});
export type DiscountInput = z.infer<typeof discountInputSchema>;

export const bulkGenerateCodesInputSchema = z.object({
  prefix: z
    .string()
    .trim()
    .max(12, "Prefix must be at most 12 characters")
    .regex(/^[A-Za-z0-9]*$/, "Only letters and numbers")
    .default(""),
  count: z.number().int().min(1).max(100),
  type: discountTypeSchema,
  value: z.number().int().positive(),
  minSpendMinor: z.number().int().nonnegative().default(0),
  endsAt: z.date().nullable().default(null),
  perUserLimit: z.number().int().positive().default(1),
});
export type BulkGenerateCodesInput = z.infer<typeof bulkGenerateCodesInputSchema>;

// Identity used to enforce per-user single-use: signed-in customers are keyed
// by uid, guests by their normalized checkout email (best-effort — a guest
// can dodge this with a new email, same as most COD storefronts accept).
export function discountRedemptionId(code: string, identity: string): string {
  return `${normalizeDiscountCode(code)}__${identity.trim().toLowerCase()}`;
}
