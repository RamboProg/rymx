import { revalidateTag } from "next/cache";

/** Tags for `unstable_cache` / `revalidateTag` across Firestore reads. */
export const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  collections: "collections",
  settings: "settings",
  content: "content",
  orders: "orders",
  inventory: "inventory",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/** Bust tagged data caches after writes. Next 16 requires a cache profile. */
export function invalidateCacheTags(...tags: CacheTag[]): void {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}
