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

export const topCollectionSchema = z.object({
  collectionId: z.string(),
  title: z.string(),
  quantitySold: z.number().int().nonnegative(),
  revenueMinor: z.number().int().nonnegative(),
});
export type TopCollection = z.infer<typeof topCollectionSchema>;

export const mostReturnedItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  quantityReturned: z.number().int().nonnegative(),
});
export type MostReturnedItem = z.infer<typeof mostReturnedItemSchema>;

export const returnReasonCountSchema = z.object({
  reasonCategory: z.string(),
  count: z.number().int().nonnegative(),
});
export type ReturnReasonCount = z.infer<typeof returnReasonCountSchema>;
