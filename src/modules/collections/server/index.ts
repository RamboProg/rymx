import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { DocumentData } from "firebase-admin/firestore";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import { toDate } from "@/lib/firebase/toDate";
import { collectionSchema, isCollectionVisible, type Collection } from "../schema";

export function parseCollection(id: string, data: DocumentData): Collection {
  return collectionSchema.parse({ id, ...data, publishAt: toDate(data.publishAt) });
}

type CachedCollection = Omit<Collection, "publishAt"> & { publishAt: string | null };

function dehydrateCollection(c: Collection): CachedCollection {
  return { ...c, publishAt: c.publishAt?.toISOString() ?? null };
}

function hydrateCollection(c: CachedCollection): Collection {
  return { ...c, publishAt: c.publishAt ? new Date(c.publishAt) : null };
}

const getCachedAllCollections = unstable_cache(
  async (): Promise<CachedCollection[]> => {
    const snap = await adminDb.collection("collections").get();
    return snap.docs.map((d) => dehydrateCollection(parseCollection(d.id, d.data())));
  },
  ["collections-all"],
  { revalidate: 60, tags: [CACHE_TAGS.collections] },
);

async function listAllCollections(): Promise<Collection[]> {
  return (await getCachedAllCollections()).map(hydrateCollection);
}

/** Admin + analytics: every collection (including inactive / scheduled). */
export const listAllCollectionsAdmin = cache(async (): Promise<Collection[]> => {
  return listAllCollections();
});

export const listLiveCollections = cache(async (): Promise<Collection[]> => {
  return (await listAllCollections()).filter((c) => isCollectionVisible(c));
});

export async function getLiveCollectionBySlug(slug: string): Promise<Collection | null> {
  const collections = await listLiveCollections();
  return collections.find((c) => c.slug === slug) ?? null;
}

export async function getCollectionsByIds(ids: readonly string[]): Promise<Collection[]> {
  if (ids.length === 0) return [];
  const all = await listAllCollections();
  const wanted = new Set(ids);
  return all.filter((c) => wanted.has(c.id));
}
