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
  // Optional — a blank reason still gets a readable fallback in the ledger
  // rather than blocking the adjustment.
  reason: z
    .string()
    .trim()
    .default("")
    .transform((r) => r || "Manual adjustment"),
});
export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;

export type VariantStockRow = {
  productId: string;
  productTitle: string;
  category: string | null;
  variantId: string;
  sku: string;
  optionValues: Record<string, string>;
  stock: number;
  priceMinor: number;
};
