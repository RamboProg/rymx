import { z } from "zod";

export const CART_MAX_QUANTITY = 99;

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(CART_MAX_QUANTITY),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  items: z.array(cartItemSchema).default([]),
});
export type Cart = z.infer<typeof cartSchema>;

export const resolvedCartLineSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  sku: z.string(),
  title: z.string(),
  slug: z.string(),
  image: z.string().nullable(),
  optionValues: z.record(z.string(), z.string()).default({}),
  quantity: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
  lineTotalMinor: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  available: z.boolean(),
});
export type ResolvedCartLine = z.infer<typeof resolvedCartLineSchema>;

export const resolvedCartSchema = z.object({
  lines: z.array(resolvedCartLineSchema),
  subtotalMinor: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  // Human-readable notices for items silently dropped or clamped during
  // resolution (removed product, archived, quantity clamped to live stock).
  issues: z.array(z.string()).default([]),
});
export type ResolvedCart = z.infer<typeof resolvedCartSchema>;
