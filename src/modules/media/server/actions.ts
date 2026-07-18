"use server";

import { randomUUID } from "node:crypto";
import { adminStorage } from "@/lib/firebase/admin";
import type { MediaAsset } from "@/modules/catalog/schema";
import { getSessionClaims } from "@/modules/rbac/server";
import { isStaff } from "@/modules/rbac/services/permissions";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type UploadMediaResult = { ok: true; asset: MediaAsset } | { ok: false; error: string };

// Firebase Storage's public download URL shape is identical for the emulator
// and production, differing only by host — the Admin SDK has no equivalent
// of the client SDK's getDownloadURL(), so this is built by hand.
function publicUrl(bucketName: string, path: string): string {
  const host =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
      ? "http://127.0.0.1:9199"
      : "https://firebasestorage.googleapis.com";
  return `${host}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;
}

export async function uploadMediaAction(formData: FormData): Promise<UploadMediaResult> {
  const claims = await getSessionClaims();
  if (!isStaff(claims?.role)) return { ok: false, error: "Sign in required" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Unsupported file type — use JPEG, PNG, WebP, or GIF" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) return { ok: false, error: "File is too large (max 5MB)" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.type.split("/")[1];
  const path = `media/${randomUUID()}.${extension}`;
  const bucket = adminStorage.bucket();
  await bucket.file(path).save(buffer, { metadata: { contentType: file.type } });

  return { ok: true, asset: { url: publicUrl(bucket.name, path), alt: "" } };
}
