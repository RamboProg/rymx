"use server";

import { v2 as cloudinary } from "cloudinary";
import type { MediaAsset } from "@/modules/catalog/schema";
import { getSessionClaims } from "@/modules/rbac/server";
import { isStaff } from "@/modules/rbac/services/permissions";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Product/collection imagery lives under this Cloudinary folder.
const UPLOAD_FOLDER = "rymx/media";

export type UploadMediaResult = { ok: true; asset: MediaAsset } | { ok: false; error: string };

// Configured once from server-only env vars. The API secret never leaves the
// server — uploads are signed by the SDK, so there's no unsigned preset to abuse.
function configureCloudinary(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return true;
}

export async function uploadMediaAction(formData: FormData): Promise<UploadMediaResult> {
  const claims = await getSessionClaims();
  if (!isStaff(claims?.role)) return { ok: false, error: "Sign in required" };

  if (!configureCloudinary()) {
    return { ok: false, error: "Media uploads are not configured. Set the CLOUDINARY_* env vars." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Unsupported file type — use JPEG, PNG, WebP, or GIF" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) return { ok: false, error: "File is too large (max 5MB)" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: UPLOAD_FOLDER,
      resource_type: "image",
    });
    return { ok: true, asset: { url: result.secure_url, alt: "" } };
  } catch {
    // Cloudinary's error can carry request details; surface a generic message
    // rather than leaking them to the client.
    return { ok: false, error: "Upload failed. Please try again." };
  }
}
