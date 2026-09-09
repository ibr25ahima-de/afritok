import { createClient } from "@supabase/supabase-js";
import { ALLOWED_AVATAR_TYPES, ALLOWED_VIDEO_TYPES, hasValidMediaSignature } from "./security-upload";

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublicKey = process.env.SUPABASE_ANON_KEY;
const supabaseAdminKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabasePublicKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabasePublicKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Deleting Storage objects requires an elevated Supabase key. Keep this
// client separate from the public/anon client used for normal uploads.
const supabaseAdmin = supabaseAdminKey
  ? createClient(supabaseUrl, supabaseAdminKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function validateStorageUpload(fileKey: string, fileBuffer: Buffer | Uint8Array, contentType: string): void {
  if (!fileKey || fileKey.length > 512 || fileKey.includes("..") || fileKey.startsWith("/") || fileKey.includes("\\")) {
    throw new Error("Invalid storage key");
  }

  const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
  if (buffer.length === 0) throw new Error("Empty upload");

  if (fileKey.startsWith("videos/")) {
    if (buffer.length > MAX_VIDEO_BYTES || !ALLOWED_VIDEO_TYPES.has(contentType) || !hasValidMediaSignature(buffer, contentType)) {
      throw new Error("Invalid video upload");
    }
  } else if (fileKey.startsWith("avatars/")) {
    if (buffer.length > MAX_AVATAR_BYTES || !ALLOWED_AVATAR_TYPES.has(contentType) || !hasValidMediaSignature(buffer, contentType)) {
      throw new Error("Invalid avatar upload");
    }
  }
}

export async function storagePut(
  fileKey: string,
  fileBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<{ key: string; url: string }> {
  try {
    validateStorageUpload(fileKey, fileBuffer, contentType);
    console.log("📤 Uploading:", fileKey);

    const { error } = await supabase.storage
      .from("videos")
      .upload(fileKey, fileBuffer, { contentType, upsert: false });

    if (error) {
      console.error("❌ Supabase upload error:", error);
      throw error;
    }

    const { data } = supabase.storage.from("videos").getPublicUrl(fileKey);
    return { key: fileKey, url: data.publicUrl };
  } catch (error) {
    console.error("[Storage] Upload failed:", error);
    throw error;
  }
}

/**
 * Delete a video object from the Supabase `videos` bucket.
 *
 * Accepts the public Supabase URL produced by storagePut(). Query strings and
 * fragments are ignored. Legacy/external video URLs are intentionally treated
 * as DB-only records so old videos can still be removed from a user's profile.
 */
export async function storageDeleteVideo(videoUrl: string): Promise<void> {
  const marker = "/storage/v1/object/public/videos/";
  const markerIndex = videoUrl.indexOf(marker);

  if (markerIndex === -1) {
    console.warn("[Storage] External/legacy video URL; no Storage object to delete:", videoUrl);
    return;
  }

  if (!supabaseAdmin) {
    throw new Error(
      "La clé Supabase de service est absente (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY)."
    );
  }

  const rawPath = videoUrl.slice(markerIndex + marker.length).split(/[?#]/, 1)[0];
  const fileKey = decodeURIComponent(rawPath).replace(/^\/+/, "");
  if (!fileKey) throw new Error("Chemin du fichier vidéo Supabase invalide.");

  const { data, error } = await supabaseAdmin.storage.from("videos").remove([fileKey]);
  if (error) {
    console.error("[Storage] Supabase video delete failed:", { fileKey, error });
    throw error;
  }

  // Supabase can return an empty array when an object was already deleted.
  // That state is safe for our delete operation: the desired final state is
  // simply that the object no longer exists.
  console.log("🗑️ Supabase video delete requested:", { fileKey, result: data });
}

export async function storageList(bucket: string) {
  const { data, error } = await supabase.storage.from(bucket).list("Untitled folder", {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) throw error;

  return (data || []).map((file) => {
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(`Untitled folder/${file.name}`);

    return { name: file.name, url: publicUrl.publicUrl };
  });
}
