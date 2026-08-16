import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import { toDate } from "@/lib/firebase/toDate";
import { uniqueSlug } from "@/lib/firebase/uniqueSlug";
import {
  categorySchema,
  type Category,
  type CategoryInput,
  type Product,
  type ProductFormInput,
  type Variant,
  type VariantInput,
} from "../schema";
import { parseShopifyProductsCsv, type ParsedProduct } from "../services/csvImport";
import { isDueToPublish } from "../services/publish";
import { listCategories, parseProduct, parseVariant } from "./index";

type CachedProduct = Omit<Product, "createdAt" | "publishAt"> & {
  createdAt: string;
  publishAt: string | null;
};

function dehydrateProduct(p: Product): CachedProduct {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    publishAt: p.publishAt?.toISOString() ?? null,
  };
}

function hydrateProduct(p: CachedProduct): Product {
  return {
    ...p,
    createdAt: new Date(p.createdAt),
    publishAt: p.publishAt ? new Date(p.publishAt) : null,
  };
}

const getCachedAllProducts = unstable_cache(
  async (): Promise<CachedProduct[]> => {
    const snap = await adminDb.collection("products").get();
    const products: Product[] = [];
    for (const d of snap.docs) {
      try {
        products.push(parseProduct(d.id, d.data()));
      } catch (err) {
        console.error(`[catalog] Skipping invalid product doc ${d.id}`, err);
      }
    }
    return products
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(dehydrateProduct);
  },
  ["catalog-all-products"],
  { revalidate: 30, tags: [CACHE_TAGS.products] },
);

export const listAllProducts = cache(async (): Promise<Product[]> => {
  return (await getCachedAllProducts()).map(hydrateProduct);
});

export async function listAllOptions(): Promise<Record<string, string[]>> {
  const products = await listAllProducts();
  const result: Record<string, string[]> = {};
  for (const product of products) {
    for (const option of product.options) {
      const values = result[option.name] ?? [];
      for (const v of option.values) if (!values.includes(v)) values.push(v);
      result[option.name] = values;
    }
  }
  return result;
}

export async function getProductForAdmin(id: string): Promise<Product | null> {
  const doc = await adminDb.doc(`products/${id}`).get();
  if (!doc.exists) return null;
  return parseProduct(doc.id, doc.data()!);
}

export async function createProduct(input: ProductFormInput): Promise<Product> {
  // The slug is derived from the title and doubles as the doc id — keeps
  // /shop/[slug] URLs stable and product ids human-readable. It's frozen once
  // set (renaming the title never changes it), so uniqueSlug only runs here.
  const id = await uniqueSlug("products", input.title);
  const ref = adminDb.doc(`products/${id}`);

  const data = {
    title: input.title,
    slug: id,
    description: input.description,
    status: input.status,
    tags: input.tags,
    category: input.category,
    media: input.media,
    options: input.options,
    minPriceMinor: 0,
    compareAtMinor: null,
    createdAt: new Date(),
    publishAt: input.publishAt,
  };
  await ref.set(data);
  return parseProduct(id, data);
}

export async function updateProduct(id: string, input: ProductFormInput): Promise<Product> {
  const ref = adminDb.doc(`products/${id}`);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Product not found.");

  // Deliberately does NOT write `slug`: the slug is frozen at creation so the
  // doc id, /shop URL, and any placed orders stay stable across title edits.
  await ref.update({
    title: input.title,
    description: input.description,
    status: input.status,
    tags: input.tags,
    category: input.category,
    media: input.media,
    options: input.options,
    publishAt: input.publishAt,
  });

  const updated = await ref.get();
  return parseProduct(updated.id, updated.data()!);
}

async function recomputeMinPrice(productId: string): Promise<void> {
  const snap = await adminDb.collection(`products/${productId}/variants`).get();
  const variants = snap.docs.map((d) => d.data());
  const prices = variants.map((d) => d.priceMinor as number);
  const minPriceMinor = prices.length > 0 ? Math.min(...prices) : 0;

  // Product-level sales set the same compare-at on every variant — denormalize
  // that onto the product so shop cards can show the struck-through original.
  let compareAtMinor: number | null = null;
  if (variants.length > 0) {
    const first = variants[0]!;
    const shared =
      typeof first.compareAtMinor === "number" &&
      first.compareAtMinor > (first.priceMinor as number) &&
      variants.every(
        (v) =>
          v.priceMinor === first.priceMinor && v.compareAtMinor === first.compareAtMinor,
      );
    if (shared) compareAtMinor = first.compareAtMinor as number;
  }

  await adminDb.doc(`products/${productId}`).update({ minPriceMinor, compareAtMinor });
}

// Appends a row to the inventoryAdjustments ledger so every stock movement is
// auditable — not just manual +/- adjustments, but also a variant's initial
// stock and any direct stock edits from the variant form. Mirrors the shape
// written by inventory/server's applyStockDeltaInTransaction.
async function logStockLedger(entry: {
  productId: string;
  productTitle: string;
  variantId: string;
  sku: string;
  delta: number;
  newStock: number;
  reason: string;
  staffUid: string;
}): Promise<void> {
  await adminDb
    .collection("inventoryAdjustments")
    .doc()
    .set({ ...entry, createdAt: new Date() });
}

export async function createVariant(
  productId: string,
  input: VariantInput,
  staffUid: string,
): Promise<Variant> {
  const productRef = adminDb.doc(`products/${productId}`);
  const productSnap = await productRef.get();
  if (!productSnap.exists) throw new Error("Product not found.");

  // SKU is never admin-entered — it's the product id, deduped the same way a
  // product's own slug is (productId, then productId-2, productId-3, …), and
  // it doubles as the variant's doc id like before.
  const sku = await uniqueSlug(`products/${productId}/variants`, productId);
  const ref = adminDb.collection(`products/${productId}/variants`).doc(sku);
  const data = { ...input, sku };
  await ref.set(data);
  await recomputeMinPrice(productId);

  // Record the opening stock so a new variant's inventory has a ledger origin.
  if (input.stock > 0) {
    await logStockLedger({
      productId,
      productTitle: productSnap.data()!.title as string,
      variantId: ref.id,
      sku,
      delta: input.stock,
      newStock: input.stock,
      reason: "initial stock",
      staffUid,
    });
  }
  return parseVariant(ref.id, data);
}

export async function updateVariant(
  productId: string,
  variantId: string,
  input: VariantInput,
  staffUid: string,
): Promise<Variant> {
  const productRef = adminDb.doc(`products/${productId}`);
  const ref = adminDb.doc(`products/${productId}/variants/${variantId}`);
  const [productSnap, existing] = await Promise.all([productRef.get(), ref.get()]);
  if (!existing.exists) throw new Error("Variant not found.");

  // sku isn't part of the input — frozen at creation, same as a product's slug.
  const oldStock = existing.data()!.stock as number;
  const sku = existing.data()!.sku as string;
  await ref.update(input);
  await recomputeMinPrice(productId);

  // A direct stock edit is a stock movement too — log the signed delta so the
  // inventory ledger stays a complete history.
  const delta = input.stock - oldStock;
  if (delta !== 0) {
    await logStockLedger({
      productId,
      productTitle: (productSnap.data()?.title as string) ?? "",
      variantId,
      sku,
      delta,
      newStock: input.stock,
      reason: "manual edit",
      staffUid,
    });
  }
  return parseVariant(variantId, { ...input, sku });
}

// Sets the same selling price (+ optional compare-at) on every variant of a
// product — used by the product-level sale controls so all sizes share one price.
export async function setAllVariantPrices(
  productId: string,
  pricing: { priceMinor: number; compareAtMinor: number | null },
): Promise<void> {
  const snap = await adminDb.collection(`products/${productId}/variants`).get();
  if (snap.empty) return;
  await Promise.all(
    snap.docs.map((d) =>
      d.ref.update({
        priceMinor: pricing.priceMinor,
        compareAtMinor: pricing.compareAtMinor,
      }),
    ),
  );
  await adminDb.doc(`products/${productId}`).update({
    minPriceMinor: pricing.priceMinor,
    compareAtMinor:
      pricing.compareAtMinor !== null && pricing.compareAtMinor > pricing.priceMinor
        ? pricing.compareAtMinor
        : null,
  });
}

export async function deleteVariant(productId: string, variantId: string): Promise<void> {
  await adminDb.doc(`products/${productId}/variants/${variantId}`).delete();
  await recomputeMinPrice(productId);
}

export async function listCategoriesForAdmin(): Promise<Category[]> {
  return listCategories();
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  // Slug derived from the title and frozen; order appends to the end.
  const slug = await uniqueSlug("categories", input.title);
  const existing = await adminDb.collection("categories").get();
  const maxOrder = existing.docs.reduce(
    (max, d) => Math.max(max, (d.data().order as number) ?? 0),
    -1,
  );
  const data = { title: input.title, slug, order: maxOrder + 1 };
  await adminDb.collection("categories").doc(slug).set(data);
  return categorySchema.parse({ id: slug, ...data });
}

// Rename only: slug (doc id) and order are preserved so existing product
// references and section ordering stay intact.
export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  const ref = adminDb.doc(`categories/${id}`);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Category not found.");
  await ref.update({ title: input.title });
  return categorySchema.parse({ id, ...existing.data(), title: input.title });
}

// Refuses to delete a category that still has products pointing at its slug, so
// products can never end up referencing a category that no longer exists.
export async function deleteCategory(id: string): Promise<void> {
  const ref = adminDb.doc(`categories/${id}`);
  const existing = await ref.get();
  if (!existing.exists) return;
  const slug = (existing.data()!.slug as string) ?? id;
  const inUse = await adminDb.collection("products").where("category", "==", slug).limit(1).get();
  if (!inUse.empty) {
    throw new Error("Can't delete a category that still has products. Reassign them first.");
  }
  await ref.delete();
}

// Persists a new display order for categories. orderedIds is the full list of
// category ids in the desired order; each doc's `order` is set to its index.
export async function reorderCategories(orderedIds: readonly string[]): Promise<void> {
  const batch = adminDb.batch();
  orderedIds.forEach((id, index) => {
    batch.update(adminDb.doc(`categories/${id}`), { order: index });
  });
  await batch.commit();
}

// Flips scheduled drops live: draft products whose publishAt has passed
// become active. Called by /api/cron/publish. Collections don't need this —
// their visibility is computed dynamically from publishAt at read time (see
// isCollectionLive and the collections rules), so there's nothing to flip.
export async function publishScheduledProducts(now: Date = new Date()): Promise<string[]> {
  const snap = await adminDb.collection("products").where("status", "==", "draft").get();
  const due = snap.docs.filter((d) =>
    isDueToPublish(d.data().status as Product["status"], toDate(d.data().publishAt), now),
  );

  await Promise.all(due.map((d) => d.ref.update({ status: "active" })));
  const ids = due.map((d) => d.id);
  if (ids.length > 0) {
    invalidateCacheTags(CACHE_TAGS.products);
  }
  return ids;
}

export type CsvImportSummary = {
  productsCreated: number;
  variantsCreated: number;
  categoriesCreated: number;
  skipped: { handle: string; reason: string }[];
};

export type CsvImportProductResult = {
  productsCreated: number;
  variantsCreated: number;
  categoriesCreated: number;
};

// Creates one product (+ variants, media, and a missing category if needed)
// from a parsed Shopify CSV row-group. Same createProduct/createVariant path
// as the admin form, so slugs/SKUs/min-price stay consistent.
export async function importParsedProduct(
  parsed: ParsedProduct,
  staffUid: string,
): Promise<CsvImportProductResult> {
  const existingCategories = await listCategoriesForAdmin();
  const match = existingCategories.find(
    (c) => c.title.toLowerCase() === parsed.category.toLowerCase(),
  );
  let categoriesCreated = 0;
  let categorySlug: string;
  if (match) {
    categorySlug = match.slug;
  } else {
    const created = await createCategory({ title: parsed.category });
    categorySlug = created.slug;
    categoriesCreated = 1;
  }

  const product = await createProduct({
    title: parsed.title,
    description: parsed.description,
    status: parsed.status,
    tags: parsed.tags,
    category: categorySlug,
    media: parsed.media,
    options: parsed.options,
    publishAt: null,
  });

  let variantsCreated = 0;
  for (const variant of parsed.variants) {
    await createVariant(product.id, variant, staffUid);
    variantsCreated += 1;
  }

  return { productsCreated: 1, variantsCreated, categoriesCreated };
}

// Bulk-creates products (+ variants, media, and any missing categories) from
// a Shopify "Export products" CSV — see services/csvImport.ts for the actual
// row-grouping/parsing. One row's failure doesn't abort the rest — it's
// recorded in `skipped` and the import continues.
export async function importProductsFromCsv(
  csvText: string,
  staffUid: string,
): Promise<CsvImportSummary> {
  const { products, skipped: parseSkipped } = parseShopifyProductsCsv(csvText);
  const skipped = [...parseSkipped];

  let productsCreated = 0;
  let variantsCreated = 0;
  let categoriesCreated = 0;

  for (const parsed of products) {
    try {
      const result = await importParsedProduct(parsed, staffUid);
      productsCreated += result.productsCreated;
      variantsCreated += result.variantsCreated;
      categoriesCreated += result.categoriesCreated;
    } catch (err) {
      skipped.push({
        handle: parsed.handle,
        reason: err instanceof Error ? err.message : "Failed to import",
      });
    }
  }

  return { productsCreated, variantsCreated, categoriesCreated, skipped };
}
