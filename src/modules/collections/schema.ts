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
});
export type Collection = z.infer<typeof collectionSchema>;

export function isCollectionLive(publishAt: Date | null): boolean {
  return !publishAt || publishAt.getTime() <= Date.now();
}
