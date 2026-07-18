import { z } from "zod";

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const mediaAssetSchema = z.object({
  url: z.string(),
  alt: z.string().default(""),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const productOptionSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string().min(1)).min(1),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

export const productSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(""),
  status: productStatusSchema,
  tags: z.array(z.string()).default([]),
  category: z.string().nullable().default(null),
  media: z.array(mediaAssetSchema).default([]),
  options: z.array(productOptionSchema).default([]),
  // Denormalized from variants at write time (Phase 6 admin writes, or the
  // Phase 3 seed script) so /shop can filter and sort without a per-product
  // subcollection read.
  minPriceMinor: z.number().int().nonnegative(),
  createdAt: z.date(),
});
export type Product = z.infer<typeof productSchema>;

export const variantSchema = z.object({
  id: z.string(),
  sku: z.string().min(1),
  optionValues: z.record(z.string(), z.string()).default({}),
  priceMinor: z.number().int().nonnegative(),
  compareAtMinor: z.number().int().nonnegative().nullable().default(null),
  stock: z.number().int().nonnegative(),
});
export type Variant = z.infer<typeof variantSchema>;

export const categorySchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  slug: z.string().min(1),
});
export type Category = z.infer<typeof categorySchema>;

export const shopSortSchema = z.enum(["newest", "price-asc", "price-desc"]);
export type ShopSort = z.infer<typeof shopSortSchema>;

export const shopSearchParamsSchema = z.object({
  category: z.string().optional(),
  collection: z.string().optional(),
  sort: shopSortSchema.default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});
export type ShopSearchParams = z.infer<typeof shopSearchParamsSchema>;

export const SHOP_PAGE_SIZE = 12;
