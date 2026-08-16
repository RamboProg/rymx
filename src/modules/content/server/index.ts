import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import { contentSettingsSchema, type ContentSettings } from "../schema";

export async function getContentSettings(): Promise<ContentSettings> {
  return unstable_cache(
    async () => {
      const snap = await adminDb.doc("content/homepage").get();
      return contentSettingsSchema.parse(snap.data() ?? {});
    },
    ["content-homepage"],
    { revalidate: 60, tags: [CACHE_TAGS.content] },
  )();
}
