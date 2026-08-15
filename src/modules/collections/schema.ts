import { z } from "zod";
import { mediaAssetSchema } from "@/modules/catalog/schema";

export const collectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(""),
  media: z.array(mediaAssetSchema).default([]),
  productIds: z.array(z.string()).default([]),
  publishAt: z.date().nullable().default(null),
  active: z.boolean().default(true),
});
export type Collection = z.infer<typeof collectionSchema>;

// slug is derived from title server-side and frozen (see collections/server/admin.ts).
export const collectionInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().default(""),
  media: z.array(mediaAssetSchema).default([]),
  productIds: z.array(z.string()).default([]),
  publishAt: z.date().nullable().default(null),
  active: z.boolean().default(true),
});
export type CollectionInput = z.infer<typeof collectionInputSchema>;

export function isCollectionLive(publishAt: Date | null): boolean {
  return !publishAt || publishAt.getTime() <= Date.now();
}

export function isCollectionVisible(collection: {
  active: boolean;
  publishAt: Date | null;
}): boolean {
  return collection.active && isCollectionLive(collection.publishAt);
}
