import { z } from "zod";

export const LOW_STOCK_THRESHOLD = 5;

export const stockAdjustmentSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  variantId: z.string(),
  sku: z.string(),
  delta: z.number().int(),
  newStock: z.number().int().nonnegative(),
  reason: z.string(),
  staffUid: z.string(),
  createdAt: z.date(),
});
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

export const adjustStockInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "Adjustment can't be zero"),
  reason: z.string().trim().min(1, "A reason is required"),
});
export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;

export type VariantStockRow = {
  productId: string;
  productTitle: string;
  variantId: string;
  sku: string;
  optionValues: Record<string, string>;
  stock: number;
};
