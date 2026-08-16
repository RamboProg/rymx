import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toDate, toDateFallback } from "@/lib/firebase/toDate";
import { listAllOrders } from "@/modules/orders/server";
import { getCatalogDisplay } from "@/modules/settings/server";
import type { CatalogSortMode } from "@/modules/settings/schema";
import {
  categorySchema,
  productSchema,
  SHOP_PAGE_SIZE,
  variantSchema,
  type Category,
  type Product,
  type ShopSearchParams,
  type ShopSort,
  type Variant,
} from "../schema";

export function parseProduct(id: string, data: DocumentData): Product {
  // Normalize Firestore quirks before Zod: null arrays, missing sale field,
  // and Timestamps that aren't Date instances yet.
  const compareAt =
    typeof data.compareAtMinor === "number" && Number.isFinite(data.compareAtMinor)
      ? Math.round(data.compareAtMinor)
      : null;

  return productSchema.parse({
    id,
    ...data,
    tags: Array.isArray(data.tags) ? data.tags : [],
    media: Array.isArray(data.media) ? data.media : [],
    options: Array.isArray(data.options) ? data.options : [],
    compareAtMinor: compareAt,
    createdAt: toDate(data.createdAt) ?? toDateFallback(data.createdAt),
    publishAt: toDate(data.publishAt),
  });
}

export function parseVariant(id: string, data: DocumentData): Variant {
  return variantSchema.parse({ id, ...data });
}

export async function listCategories(): Promise<Category[]> {
  const snap = await adminDb.collection("categories").get();
  return snap.docs
    .map((d) => categorySchema.parse({ id: d.id, ...d.data() }))
    .sort((a, b) => a.order - b.order);
}

// Every live product, unpaginated/unfiltered — for the sitemap generator,
// which needs every public URL, not a shop-page's worth.
export async function listAllActiveProducts(): Promise<Product[]> {
  const snap = await adminDb.collection("products").where("status", "==", "active").get();
  const products: Product[] = [];
  for (const d of snap.docs) {
    try {
      products.push(parseProduct(d.id, d.data()));
    } catch (err) {
      console.error(`[catalog] Skipping invalid product doc ${d.id}`, err);
    }
  }
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const snap = await adminDb
    .collection("products")
    .where("slug", "==", slug)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return parseProduct(doc.id, doc.data());
}

// Unlike getProductBySlug, not status-scoped: callers (cart/checkout re-pricing)
// need to see a product that was added while active but has since been
// archived, so they can surface "no longer available" instead of a 404.
export async function getProductById(productId: string): Promise<Product | null> {
  const doc = await adminDb.doc(`products/${productId}`).get();
  if (!doc.exists) return null;
  return parseProduct(doc.id, doc.data()!);
}

export async function listVariants(productId: string): Promise<Variant[]> {
  const snap = await adminDb.collection(`products/${productId}/variants`).get();
  return snap.docs.map((d) => parseVariant(d.id, d.data()));
}

export async function getVariantById(
  productId: string,
  variantId: string,
): Promise<Variant | null> {
  const doc = await adminDb.doc(`products/${productId}/variants/${variantId}`).get();
  if (!doc.exists) return null;
  return parseVariant(doc.id, doc.data()!);
}

export type ShopPage = { products: Product[]; total: number };

// Fills product.compareAtMinor from variants when the denormalized field is
// missing (e.g. sale set only on variants, or before product-level sale sync).
// So shop cards can always show the original price struck through.
async function enrichProductsWithSalePricing(products: Product[]): Promise<Product[]> {
  const needsEnrichment = products.filter(
    (p) => p.compareAtMinor == null || p.compareAtMinor <= p.minPriceMinor,
  );
  if (needsEnrichment.length === 0) return products;

  const byId = new Map(products.map((p) => [p.id, p]));
  await Promise.all(
    needsEnrichment.map(async (product) => {
      const snap = await adminDb.collection(`products/${product.id}/variants`).get();
      if (snap.empty) return;
      const variants = snap.docs.map((d) => d.data());
      const first = variants[0]!;
      const compareAt = first.compareAtMinor as number | null | undefined;
      const price = first.priceMinor as number;
      if (
        typeof compareAt === "number" &&
        compareAt > price &&
        variants.every(
          (v) => v.priceMinor === price && v.compareAtMinor === compareAt,
        )
      ) {
        byId.set(product.id, {
          ...product,
          minPriceMinor: Math.min(product.minPriceMinor, price),
          compareAtMinor: compareAt,
        });
      }
    }),
  );
  return products.map((p) => byId.get(p.id) ?? p);
}

// Catalog-scale simplification: fetch all active products with one query and
// filter/sort/paginate in memory. Fine at MVP scale; revisit with composite
// indexes + Firestore-side pagination if the catalog grows large.
export async function listShopProducts(
  params: ShopSearchParams,
  productIdFilter?: readonly string[] | null,
): Promise<ShopPage> {
  const snap = await adminDb.collection("products").where("status", "==", "active").get();
  let products: Product[] = [];
  for (const d of snap.docs) {
    try {
      products.push(parseProduct(d.id, d.data()));
    } catch (err) {
      console.error(`[catalog] Skipping invalid product doc ${d.id}`, err);
    }
  }

  if (productIdFilter) {
    const allowed = new Set(productIdFilter);
    products = products.filter((p) => allowed.has(p.id));
  }
  if (params.category) {
    products = products.filter((p) => p.category === params.category);
  }

  products = await enrichProductsWithSalePricing(products);
  const sortCtx = await resolveSortContext(params.sort);
  products = sortProducts(products, params.sort, sortCtx);
  return paginate(products, params.page);
}

export type ShopCategorySection = { category: Category; products: Product[] };

export type SortContext = {
  soldByProductId: Map<string, number>;
  manualOrderIds: readonly string[];
};

export async function getProductSoldQuantities(): Promise<Map<string, number>> {
  const orders = await listAllOrders();
  const map = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
  }
  return map;
}

async function resolveSortContext(sort: ShopSort): Promise<SortContext> {
  const display = await getCatalogDisplay();
  const soldByProductId =
    sort === "best-selling" ? await getProductSoldQuantities() : new Map<string, number>();
  return { soldByProductId, manualOrderIds: display.manualOrderIds };
}

// Groups every active product under its category, for the default /shop view
// (one heading + grid per category, in the categories' `order`). Product order
// inside each section follows the store's catalog display default (or an
// explicit ?sort= override from the shop page).
export async function listShopProductsByCategory(
  sort: ShopSort = "newest",
): Promise<ShopCategorySection[]> {
  const [snap, categories, sortCtx] = await Promise.all([
    adminDb.collection("products").where("status", "==", "active").get(),
    listCategories(),
    resolveSortContext(sort),
  ]);
  const products: Product[] = [];
  for (const d of snap.docs) {
    try {
      products.push(parseProduct(d.id, d.data()));
    } catch (err) {
      console.error(`[catalog] Skipping invalid product doc ${d.id}`, err);
    }
  }
  const enriched = await enrichProductsWithSalePricing(products);
  return categories
    .map((category) => ({
      category,
      products: sortProducts(
        enriched.filter((p) => p.category === category.slug),
        sort,
        sortCtx,
      ),
    }))
    .filter((section) => section.products.length > 0);
}

export function sortProducts(
  products: Product[],
  sort: ShopSort | CatalogSortMode,
  ctx: SortContext = { soldByProductId: new Map(), manualOrderIds: [] },
): Product[] {
  const sorted = [...products];
  if (sort === "price-asc") {
    sorted.sort(
      (a, b) => a.minPriceMinor - b.minPriceMinor || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  } else if (sort === "price-desc") {
    sorted.sort(
      (a, b) => b.minPriceMinor - a.minPriceMinor || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  } else if (sort === "best-selling") {
    sorted.sort(
      (a, b) =>
        (ctx.soldByProductId.get(b.id) ?? 0) - (ctx.soldByProductId.get(a.id) ?? 0) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
  } else if (sort === "manual") {
    const index = new Map(ctx.manualOrderIds.map((id, i) => [id, i]));
    sorted.sort((a, b) => {
      const ai = index.has(a.id) ? index.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bi = index.has(b.id) ? index.get(b.id)! : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  } else {
    sorted.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.slug.localeCompare(b.slug),
    );
  }
  return sorted;
}

function paginate(products: Product[], page: number): ShopPage {
  const start = (page - 1) * SHOP_PAGE_SIZE;
  return { products: products.slice(start, start + SHOP_PAGE_SIZE), total: products.length };
}
