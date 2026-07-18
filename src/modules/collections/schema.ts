import { z } from "zod";
import { mediaAssetSchema, SLUG_MESSAGE, SLUG_REGEX } from "@/modules/catalog/schema";

export const collectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(""),
  media: z.array(mediaAssetSchema).default([]),
  productIds: z.array(z.string()).default([]),
  publishAt: z.date().nullable().default(null),
});
export type Collection = z.infer<typeof collectionSchema>;

export const collectionInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().min(1, "Slug is required").regex(SLUG_REGEX, SLUG_MESSAGE),
  description: z.string().default(""),
  media: z.array(mediaAssetSchema).default([]),
  productIds: z.array(z.string()).default([]),
  publishAt: z.date().nullable().default(null),
});
export type CollectionInput = z.infer<typeof collectionInputSchema>;

export function isCollectionLive(publishAt: Date | null): boolean {
  return !publishAt || publishAt.getTime() <= Date.now();
}
