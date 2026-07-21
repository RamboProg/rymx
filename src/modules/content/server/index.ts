import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { contentSettingsSchema, type ContentSettings } from "../schema";

export async function getContentSettings(): Promise<ContentSettings> {
  const snap = await adminDb.doc("content/homepage").get();
  return contentSettingsSchema.parse(snap.data() ?? {});
}
