import { z } from "zod";

// Lowercase, alphanumeric, hyphen-separated. No nested quantifiers over
// overlapping character classes, so this can't backtrack catastrophically —
// the security linter's regex heuristic just can't tell that from the
// pattern shape alone.
// eslint-disable-next-line security/detect-unsafe-regex
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE = "Slug must be lowercase, alphanumeric, and hyphen-separated";

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
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  // Scheduled drop: while status is "draft" and publishAt is set, the
  // /api/cron/publish route flips status to "active" once publishAt passes.
  // Has no effect once status is already "active" or "archived".
  publishAt: z.date().nullable().default(null),
});
export type Product = z.infer<typeof productSchema>;

// Note: `slug` is intentionally absent — it's never client-supplied. The server
// derives it from `title` on create and freezes it thereafter (see
// createProduct in server/admin.ts). `category` is required: every product must
// belong to a category (the shop groups by category, admin manages them).
export const productInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().default(""),
  status: productStatusSchema.default("draft"),
  tags: z.array(z.string()).default([]),
  category: z.string().trim().min(1, "Category is required"),
  seoTitle: z.string().trim().default(""),
  seoDescription: z.string().trim().default(""),
  publishAt: z.date().nullable().default(null),
});
export type ProductInput = z.infer<typeof productInputSchema>;

// What the product edit form actually submits: the plain fields above plus
// media/options, which the form owns directly (variants are managed
// separately, since they only exist once the product itself has an id).
export const productFormSchema = productInputSchema.extend({
  media: z.array(mediaAssetSchema).default([]),
  options: z.array(productOptionSchema).default([]),
});
export type ProductFormInput = z.infer<typeof productFormSchema>;

export const variantSchema = z.object({
  id: z.string(),
  sku: z.string().min(1),
  optionValues: z.record(z.string(), z.string()).default({}),
  priceMinor: z.number().int().nonnegative(),
  compareAtMinor: z.number().int().nonnegative().nullable().default(null),
  stock: z.number().int().nonnegative(),
});
export type Variant = z.infer<typeof variantSchema>;

export const variantInputSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required"),
  optionValues: z.record(z.string(), z.string()).default({}),
  priceMinor: z.number().int().nonnegative("Price can't be negative"),
  compareAtMinor: z.number().int().nonnegative().nullable().default(null),
  stock: z.number().int().nonnegative("Stock can't be negative"),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

export const categorySchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  slug: z.string().min(1),
  // Controls the order categories appear as sections on /shop and rows in the
  // admin Categories page. Assigned server-side (append to end on create).
  order: z.number().int().nonnegative().default(0),
});
export type Category = z.infer<typeof categorySchema>;

// Only the title is client-supplied; slug is derived from it and frozen, and
// order is assigned server-side. Rename reuses this same shape.
export const categoryInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

// Payload for the admin Categories reorder control: the full list of category
// ids in the desired display order.
export const categoryReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type CategoryReorderInput = z.infer<typeof categoryReorderSchema>;

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
