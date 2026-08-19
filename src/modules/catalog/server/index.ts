import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { DocumentData } from "firebase-admin/firestore";
import { CACHE_TAGS } from "@/lib/cache/tags";
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

const getCachedCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const snap = await adminDb.collection("categories").get();
    return snap.docs
      .map((d) => categorySchema.parse({ id: d.id, ...d.data() }))
      .sort((a, b) => a.order - b.order);
  },
  ["catalog-categories"],
  { revalidate: 300, tags: [CACHE_TAGS.categories] },
);

export const listCategories = cache(async (): Promise<Category[]> => getCachedCategories());

async function fetchActiveProductsRaw(): Promise<CachedProduct[]> {
  const snap = await adminDb.collection("products").where("status", "==", "active").get();
  const products: Product[] = [];
  for (const d of snap.docs) {
    try {
      products.push(parseProduct(d.id, d.data()));
    } catch (err) {
      console.error(`[catalog] Skipping invalid product doc ${d.id}`, err);
    }
  }
  const enriched = await enrichProductsWithSalePricing(products);
  return enriched.map(dehydrateProduct);
}

const getCachedActiveProducts = unstable_cache(
  fetchActiveProductsRaw,
  ["catalog-active-products"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.products],
  },
);

// Every live product, unpaginated/unfiltered — for the sitemap generator,
// which needs every public URL, not a shop-page's worth.
export const listAllActiveProducts = cache(async (): Promise<Product[]> => {
  return (await getCachedActiveProducts()).map(hydrateProduct);
});

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const cached = await unstable_cache(
    async (): Promise<CachedProduct | null> => {
      const snap = await adminDb
        .collection("products")
        .where("slug", "==", slug)
        .where("status", "==", "active")
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0]!;
      return dehydrateProduct(parseProduct(doc.id, doc.data()));
    },
    ["product-by-slug", slug],
    { revalidate: 60, tags: [CACHE_TAGS.products] },
  )();
  return cached ? hydrateProduct(cached) : null;
}

// Unlike getProductBySlug, not status-scoped: callers (cart/checkout re-pricing)
// need to see a product that was added while active but has since been
// archived, so they can surface "no longer available" instead of a 404.
// Left uncached — cart/checkout needs fresh availability.
export async function getProductById(productId: string): Promise<Product | null> {
  const doc = await adminDb.doc(`products/${productId}`).get();
  if (!doc.exists) return null;
  return parseProduct(doc.id, doc.data()!);
}

export async function listVariants(productId: string): Promise<Variant[]> {
  return unstable_cache(
    async () => {
      const snap = await adminDb.collection(`products/${productId}/variants`).get();
      return snap.docs.map((d) => parseVariant(d.id, d.data()));
    },
    ["product-variants", productId],
    { revalidate: 30, tags: [CACHE_TAGS.products, CACHE_TAGS.inventory] },
  )();
}

// Live stock/price for cart + checkout — do not cache.
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
        variants.every((v) => v.priceMinor === price && v.compareAtMinor === compareAt)
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
  let products = await listAllActiveProducts();

  if (productIdFilter) {
    const allowed = new Set(productIdFilter);
    products = products.filter((p) => allowed.has(p.id));
  }
  if (params.category) {
    products = products.filter((p) => p.category === params.category);
  }

  const sortCtx = await resolveSortContext(params.sort);
  products = sortProducts(products, params.sort, sortCtx);
  return paginate(products, params.page);
}

export type ShopCategorySection = { category: Category; products: Product[] };

export type SortContext = {
  soldByProductId: Map<string, number>;
  manualOrderIds: readonly string[];
};

const getCachedSoldQuantities = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const orders = await listAllOrders();
    const map: Record<string, number> = {};
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      for (const item of order.items) {
        map[item.productId] = (map[item.productId] ?? 0) + item.quantity;
      }
    }
    return map;
  },
  ["product-sold-quantities"],
  { revalidate: 120, tags: [CACHE_TAGS.orders] },
);

export async function getProductSoldQuantities(): Promise<Map<string, number>> {
  return new Map(Object.entries(await getCachedSoldQuantities()));
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
  const [products, categories, sortCtx] = await Promise.all([
    listAllActiveProducts(),
    listCategories(),
    resolveSortContext(sort),
  ]);
  return categories
    .map((category) => ({
      category,
      products: sortProducts(
        products.filter((p) => p.category === category.slug),
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
