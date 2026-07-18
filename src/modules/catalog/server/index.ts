import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
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

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function parseProduct(id: string, data: DocumentData): Product {
  return productSchema.parse({ id, ...data, createdAt: toDate(data.createdAt) });
}

function parseVariant(id: string, data: DocumentData): Variant {
  return variantSchema.parse({ id, ...data });
}

export async function listCategories(): Promise<Category[]> {
  const snap = await adminDb.collection("categories").get();
  return snap.docs.map((d) => categorySchema.parse({ id: d.id, ...d.data() }));
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

  products = sortProducts(products, params.sort);
  return paginate(products, params.page);
}

function sortProducts(products: Product[], sort: ShopSearchParams["sort"]): Product[] {
  const sorted = [...products];
  if (sort === "price-asc") sorted.sort((a, b) => a.minPriceMinor - b.minPriceMinor);
  else if (sort === "price-desc") sorted.sort((a, b) => b.minPriceMinor - a.minPriceMinor);
  else sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return sorted;
}

function paginate(products: Product[], page: number): ShopPage {
  const start = (page - 1) * SHOP_PAGE_SIZE;
  return { products: products.slice(start, start + SHOP_PAGE_SIZE), total: products.length };
}
