import { z } from "zod";

export const returnStatusSchema = z.enum(["requested", "approved", "rejected", "restocked"]);
export type ReturnStatus = z.infer<typeof returnStatusSchema>;

// Fixed reason categories — the only way "most common return reason" can
// mean anything in analytics. Shared source of truth for both the customer
// self-service form and the staff "log a return" form. Values only — display
// labels come from the `returnReasons` message namespace (see
// returnReasonLabel below), not baked in here, so they localize.
export const RETURN_REASONS = [
  { value: "wrong_size" },
  { value: "changed_mind" },
  { value: "defective" },
  { value: "not_as_described" },
  { value: "other" },
] as const;
export const returnReasonCategorySchema = z.enum(
  RETURN_REASONS.map((r) => r.value) as [string, ...string[]],
);
export type ReturnReasonCategory = z.infer<typeof returnReasonCategorySchema>;

// reasonDetail is always present in the type but only meaningfully populated
// when reasonCategory is "other" (free-text elaboration). `t` is the
// `returnReasons` namespace's translate function from the calling component.
export function returnReasonLabel(
  item: { reasonCategory: string; reasonDetail: string },
  t: (key: string) => string,
): string {
  if (item.reasonCategory === "other") return item.reasonDetail || t("other");
  return RETURN_REASONS.some((r) => r.value === item.reasonCategory)
    ? t(item.reasonCategory)
    : item.reasonCategory;
}

export const returnItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  sku: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  reasonCategory: returnReasonCategorySchema,
  reasonDetail: z.string().default(""),
});
export type ReturnItem = z.infer<typeof returnItemSchema>;

export const returnSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  items: z.array(returnItemSchema).min(1),
  status: returnStatusSchema.default("requested"),
  refundMinor: z.number().int().nonnegative(),
  refunded: z.boolean().default(false),
  createdAt: z.date(),
  decidedAt: z.date().nullable().default(null),
  decidedByUid: z.string().nullable().default(null),
});
export type Return = z.infer<typeof returnSchema>;

export const createReturnInputSchema = z.object({
  orderId: z.string().min(1),
  items: z
    .array(
      z
        .object({
          variantId: z.string().min(1),
          quantity: z.number().int().positive(),
          reasonCategory: returnReasonCategorySchema,
          reasonDetail: z.string().trim().default(""),
        })
        .refine((item) => item.reasonCategory !== "other" || item.reasonDetail.length > 0, {
          message: "Please describe the reason",
          path: ["reasonDetail"],
        }),
    )
    .min(1, "Select at least one item to return"),
  refundMinor: z.number().int().nonnegative(),
});
export type CreateReturnInput = z.infer<typeof createReturnInputSchema>;

export const rejectReturnInputSchema = z.object({
  returnId: z.string().min(1),
});
export type RejectReturnInput = z.infer<typeof rejectReturnInputSchema>;
