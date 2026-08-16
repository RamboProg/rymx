import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toDate } from "@/lib/firebase/toDate";
import {
  categorySchema,
  productSchema,
  SHOP_PAGE_SIZE,
  variantSchema,
  type Category,
  type Product,
  type ShopSearchParams,
  type Variant,
} from "../schema";

export function parseProduct(id: string, data: DocumentData): Product {
  return productSchema.parse({
    id,
    ...data,
    createdAt: toDate(data.createdAt),
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
  return snap.docs.map((d) => parseProduct(d.id, d.data()));
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
  let products = snap.docs.map((d) => parseProduct(d.id, d.data()));

  if (productIdFilter) {
    const allowed = new Set(productIdFilter);
    products = products.filter((p) => allowed.has(p.id));
  }
  if (params.category) {
    products = products.filter((p) => p.category === params.category);
  }

  products = await enrichProductsWithSalePricing(products);
  products = sortProducts(products, params.sort);
  return paginate(products, params.page);
}

export type ShopCategorySection = { category: Category; products: Product[] };

// Groups every active product under its category, for the default /shop view
// (one heading + grid per category, in the categories' `order`). Within each
// category, newest products always come first — the global price sort only
// applies when a single category is selected (listShopProducts).
export async function listShopProductsByCategory(): Promise<ShopCategorySection[]> {
  const [snap, categories] = await Promise.all([
    adminDb.collection("products").where("status", "==", "active").get(),
    listCategories(),
  ]);
  const products = await enrichProductsWithSalePricing(
    snap.docs.map((d) => parseProduct(d.id, d.data())),
  );
  return categories
    .map((category) => ({
      category,
      products: sortProducts(
        products.filter((p) => p.category === category.slug),
        "newest",
      ),
    }))
    .filter((section) => section.products.length > 0);
}

function sortProducts(products: Product[], sort: ShopSearchParams["sort"]): Product[] {
  const sorted = [...products];
  if (sort === "price-asc") {
    sorted.sort(
      (a, b) => a.minPriceMinor - b.minPriceMinor || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  } else if (sort === "price-desc") {
    sorted.sort(
      (a, b) => b.minPriceMinor - a.minPriceMinor || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  } else {
    // Newest first; slug tie-break keeps order stable when timestamps match
    // (e.g. rapid CSV import).
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
