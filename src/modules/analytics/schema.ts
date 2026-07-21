import { z } from "zod";

export const dailySalesSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  orderCount: z.number().int().nonnegative(),
  revenueMinor: z.number().int().nonnegative(),
});
export type DailySales = z.infer<typeof dailySalesSchema>;

export const topProductSchema = z.object({
  productId: z.string(),
  title: z.string(),
  quantitySold: z.number().int().nonnegative(),
  revenueMinor: z.number().int().nonnegative(),
});
export type TopProduct = z.infer<typeof topProductSchema>;

export const discountPerformanceSchema = z.object({
  code: z.string(),
  redeemedCount: z.number().int().nonnegative(),
  discountGivenMinor: z.number().int().nonnegative(),
});
export type DiscountPerformance = z.infer<typeof discountPerformanceSchema>;
