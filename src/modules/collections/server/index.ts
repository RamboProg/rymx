import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toDate } from "@/lib/firebase/toDate";
import { collectionSchema, isCollectionVisible, type Collection } from "../schema";

export function parseCollection(id: string, data: DocumentData): Collection {
  return collectionSchema.parse({ id, ...data, publishAt: toDate(data.publishAt) });
}

export async function listLiveCollections(): Promise<Collection[]> {
  const snap = await adminDb.collection("collections").get();
  return snap.docs
    .map((d) => parseCollection(d.id, d.data()))
    .filter((c) => isCollectionVisible(c));
}

export async function getLiveCollectionBySlug(slug: string): Promise<Collection | null> {
  const collections = await listLiveCollections();
  return collections.find((c) => c.slug === slug) ?? null;
}

export async function getCollectionsByIds(ids: readonly string[]): Promise<Collection[]> {
  if (ids.length === 0) return [];
  const docs = await Promise.all(ids.map((id) => adminDb.doc(`collections/${id}`).get()));
  return docs.filter((d) => d.exists).map((d) => parseCollection(d.id, d.data()!));
}
