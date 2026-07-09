import "server-only";
import { del, put } from "@vercel/blob";

/**
 * Client photo storage on Vercel Blob. Blob URLs are public but carry an
 * unguessable random suffix; they are only ever rendered inside
 * staff-authenticated pages and the owning client's portal.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function storageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Validates and uploads a photo; returns its URL. Throws with a
 *  user-presentable message on any problem. */
export async function uploadPhotoBlob(
  clientId: string,
  file: File,
): Promise<string> {
  if (!storageConfigured()) {
    throw new Error(
      "Photo storage is not configured (set BLOB_READ_WRITE_TOKEN)",
    );
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Photos must be JPEG, PNG, or WebP");
  if (file.size === 0) throw new Error("The selected file is empty");
  if (file.size > MAX_BYTES) throw new Error("Photos must be under 5 MB");

  const blob = await put(`clients/${clientId}/photo.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });
  return blob.url;
}

/** Best-effort blob removal when a photo row is deleted. */
export async function deletePhotoBlob(url: string): Promise<void> {
  if (!storageConfigured()) return;
  if (!url.includes(".blob.vercel-storage.com/")) return; // externally-hosted URL
  try {
    await del(url);
  } catch (err) {
    console.warn("blob delete failed (row already removed):", err);
  }
}
