import "server-only";

import { slugify } from "@/lib/slug";
import { adminDb } from "./admin";

// Derives a slug from a title and guarantees it's unique as a document id within
// the given top-level collection, appending -2, -3, … on collision. The slug
// doubles as the Firestore doc id (products/categories/collections), so this is
// the single place that enforces "generate from title, stay unique". Collisions
// are rare, so the bounded scan is fine at catalog scale.
export async function uniqueSlug(collectionPath: string, title: string): Promise<string> {
  const base = slugify(title) || "item";
  let candidate = base;
  let n = 2;
  while ((await adminDb.collection(collectionPath).doc(candidate).get()).exists) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}
