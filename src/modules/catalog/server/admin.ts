import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  categorySchema,
  type Category,
  type CategoryInput,
  type Product,
  type ProductFormInput,
  type Variant,
  type VariantInput,
} from "../schema";
import { isDueToPublish } from "../services/publish";
import { parseProduct, parseVariant, toDate } from "./index";

export async function listAllProducts(): Promise<Product[]> {
  const snap = await adminDb.collection("products").get();
  return snap.docs
    .map((d) => parseProduct(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getProductForAdmin(id: string): Promise<Product | null> {
  const doc = await adminDb.doc(`products/${id}`).get();
  if (!doc.exists) return null;
  return parseProduct(doc.id, doc.data()!);
}

export async function createProduct(input: ProductFormInput): Promise<Product> {
  // The slug doubles as the doc id, matching scripts/seed.ts's convention —
  // keeps /shop/[slug] URLs stable and product ids human-readable.
  const id = input.slug;
  const ref = adminDb.doc(`products/${id}`);
  if ((await ref.get()).exists) {
    throw new Error(`A product with slug "${input.slug}" already exists.`);
  }

  const data = {
    title: input.title,
    slug: input.slug,
    description: input.description,
    status: input.status,
    tags: input.tags,
    category: input.category,
    media: input.media,
    options: input.options,
    minPriceMinor: 0,
    createdAt: new Date(),
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    publishAt: input.publishAt,
  };
  await ref.set(data);
  return parseProduct(id, data);
}

export async function updateProduct(id: string, input: ProductFormInput): Promise<Product> {
  const ref = adminDb.doc(`products/${id}`);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Product not found.");

  await ref.update({
    title: input.title,
    slug: input.slug,
    description: input.description,
    status: input.status,
    tags: input.tags,
    category: input.category,
    media: input.media,
    options: input.options,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    publishAt: input.publishAt,
  });

  const updated = await ref.get();
  return parseProduct(updated.id, updated.data()!);
}

export async function archiveProduct(id: string): Promise<void> {
  await adminDb.doc(`products/${id}`).update({ status: "archived" });
}

async function recomputeMinPrice(productId: string): Promise<void> {
  const snap = await adminDb.collection(`products/${productId}/variants`).get();
  const prices = snap.docs.map((d) => d.data().priceMinor as number);
  const minPriceMinor = prices.length > 0 ? Math.min(...prices) : 0;
  await adminDb.doc(`products/${productId}`).update({ minPriceMinor });
}

export async function createVariant(productId: string, input: VariantInput): Promise<Variant> {
  const ref = adminDb.collection(`products/${productId}/variants`).doc(input.sku);
  if ((await ref.get()).exists) {
    throw new Error(`A variant with SKU "${input.sku}" already exists on this product.`);
  }
  await ref.set(input);
  await recomputeMinPrice(productId);
  return parseVariant(ref.id, input);
}

export async function updateVariant(
  productId: string,
  variantId: string,
  input: VariantInput,
): Promise<Variant> {
  const ref = adminDb.doc(`products/${productId}/variants/${variantId}`);
  if (!(await ref.get()).exists) throw new Error("Variant not found.");
  await ref.update(input);
  await recomputeMinPrice(productId);
  return parseVariant(variantId, input);
}

export async function deleteVariant(productId: string, variantId: string): Promise<void> {
  await adminDb.doc(`products/${productId}/variants/${variantId}`).delete();
  await recomputeMinPrice(productId);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const ref = adminDb.collection("categories").doc(input.slug);
  if ((await ref.get()).exists) {
    throw new Error(`A category with slug "${input.slug}" already exists.`);
  }
  await ref.set(input);
  return categorySchema.parse({ id: ref.id, ...input });
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
  return due.map((d) => d.id);
}
