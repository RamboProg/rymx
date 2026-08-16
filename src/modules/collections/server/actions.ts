"use server";

import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache/tags";
import { requireAdminPermission } from "@/modules/rbac/server";
import { collectionInputSchema, type Collection } from "../schema";
import { createCollection, deleteCollection, updateCollection, updateCollectionDoc } from "./admin";

type CollectionActionResult = { ok: true; collection: Collection } | { ok: false; error: string };
type VoidActionResult = { ok: true } | { ok: false; error: string };

async function requireCollectionsWrite(): Promise<boolean> {
  return (await requireAdminPermission("collections:write")) !== null;
}

export async function createCollectionAction(rawInput: unknown): Promise<CollectionActionResult> {
  if (!(await requireCollectionsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = collectionInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const collection = await createCollection(parsed.data);
    invalidateCacheTags(CACHE_TAGS.collections);
    revalidatePath("/admin/collections");
    revalidatePath("/collections");
    return { ok: true, collection };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create collection" };
  }
}

export async function updateCollectionAction(
  collectionId: string,
  rawInput: unknown,
): Promise<CollectionActionResult> {
  if (!(await requireCollectionsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = collectionInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const collection = await updateCollection(collectionId, parsed.data);
    invalidateCacheTags(CACHE_TAGS.collections);
    revalidatePath("/admin/collections");
    revalidatePath(`/admin/collections/${collectionId}`);
    revalidatePath("/collections");
    revalidatePath(`/collections/${collection.slug}`);
    return { ok: true, collection };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update collection" };
  }
}

export async function deleteCollectionAction(collectionId: string): Promise<VoidActionResult> {
  if (!(await requireCollectionsWrite())) return { ok: false, error: "Forbidden" };
  await deleteCollection(collectionId);
  invalidateCacheTags(CACHE_TAGS.collections);
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  return { ok: true };
}

export async function setCollectionActiveAction(
  id: string,
  active: boolean,
): Promise<VoidActionResult> {
  if (!(await requireCollectionsWrite())) return { ok: false, error: "Forbidden" };

  await updateCollectionDoc(id, { active });
  invalidateCacheTags(CACHE_TAGS.collections);
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  return { ok: true };
}
