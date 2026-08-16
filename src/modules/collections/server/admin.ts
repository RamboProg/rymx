import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { uniqueSlug } from "@/lib/firebase/uniqueSlug";
import type { Collection, CollectionInput } from "../schema";
import { listAllCollectionsAdmin, parseCollection } from "./index";

export { listAllCollectionsAdmin };

export async function getCollectionForAdmin(id: string): Promise<Collection | null> {
  const doc = await adminDb.doc(`collections/${id}`).get();
  if (!doc.exists) return null;
  return parseCollection(doc.id, doc.data()!);
}

export async function createCollection(input: CollectionInput): Promise<Collection> {
  // Slug derived from the title and frozen; it doubles as the doc id.
  const slug = await uniqueSlug("collections", input.title);
  const data = { ...input, slug };
  await adminDb.collection("collections").doc(slug).set(data);
  return parseCollection(slug, data);
}

export async function updateCollection(id: string, input: CollectionInput): Promise<Collection> {
  const ref = adminDb.doc(`collections/${id}`);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Collection not found.");
  // Preserve the frozen slug (input no longer carries one) so a title rename
  // can't drop or desync it from the doc id.
  const slug = (existing.data()!.slug as string) ?? id;
  const data = { ...input, slug };
  await ref.set(data);
  return parseCollection(id, data);
}

export async function deleteCollection(id: string): Promise<void> {
  await adminDb.doc(`collections/${id}`).delete();
}

export async function updateCollectionDoc(
  id: string,
  data: Partial<Omit<Collection, "id">>,
): Promise<void> {
  await adminDb.doc(`collections/${id}`).update(data);
}
