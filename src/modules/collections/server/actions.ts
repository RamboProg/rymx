"use server";

import { revalidatePath } from "next/cache";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import { collectionInputSchema, type Collection } from "../schema";
import { createCollection, deleteCollection, updateCollection } from "./admin";

type CollectionActionResult = { ok: true; collection: Collection } | { ok: false; error: string };
type VoidActionResult = { ok: true } | { ok: false; error: string };

async function requireCollectionsWrite(): Promise<boolean> {
  const claims = await getSessionClaims();
  return hasPermission(claims, "collections:write");
}

export async function createCollectionAction(rawInput: unknown): Promise<CollectionActionResult> {
  if (!(await requireCollectionsWrite())) return { ok: false, error: "Forbidden" };

  const parsed = collectionInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const collection = await createCollection(parsed.data);
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
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  return { ok: true };
}
