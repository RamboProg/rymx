import { z } from "zod";

export const returnStatusSchema = z.enum(["requested", "approved", "rejected", "restocked"]);
export type ReturnStatus = z.infer<typeof returnStatusSchema>;

export const returnItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  sku: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  reason: z.string(),
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
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        reason: z.string().trim().min(1, "A reason is required"),
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
