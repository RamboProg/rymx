import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import type { Collection, CollectionInput } from "../schema";
import { parseCollection } from "./index";

export async function listAllCollectionsAdmin(): Promise<Collection[]> {
  const snap = await adminDb.collection("collections").get();
  return snap.docs.map((d) => parseCollection(d.id, d.data()));
}

export async function getCollectionForAdmin(id: string): Promise<Collection | null> {
  const doc = await adminDb.doc(`collections/${id}`).get();
  if (!doc.exists) return null;
  return parseCollection(doc.id, doc.data()!);
}

export async function createCollection(input: CollectionInput): Promise<Collection> {
  const ref = adminDb.collection("collections").doc(input.slug);
  if ((await ref.get()).exists) {
    throw new Error(`A collection with slug "${input.slug}" already exists.`);
  }
  await ref.set(input);
  return parseCollection(ref.id, input);
}

export async function updateCollection(id: string, input: CollectionInput): Promise<Collection> {
  const ref = adminDb.doc(`collections/${id}`);
  if (!(await ref.get()).exists) throw new Error("Collection not found.");
  await ref.set(input);
  return parseCollection(id, input);
}

export async function deleteCollection(id: string): Promise<void> {
  await adminDb.doc(`collections/${id}`).delete();
}
