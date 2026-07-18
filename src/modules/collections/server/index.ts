import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { collectionSchema, isCollectionLive, type Collection } from "../schema";

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function parseCollection(id: string, data: DocumentData): Collection {
  return collectionSchema.parse({ id, ...data, publishAt: toDate(data.publishAt) });
}

export async function listLiveCollections(): Promise<Collection[]> {
  const snap = await adminDb.collection("collections").get();
  return snap.docs
    .map((d) => parseCollection(d.id, d.data()))
    .filter((c) => isCollectionLive(c.publishAt));
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
