import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
// These credentials are intentionally read only in this server-side module.
// Never use the anon key for privileged video uploads.
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim();

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing server Supabase credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STORAGE_BUCKET = "videos";
const MAX_FILE_NAME_LENGTH = 120;

function validateUserId(userId: number): string {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Invalid authenticated user id");
  }
  return String(userId);
}

function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== "string") {
    throw new Error("Invalid file name");
  }

  // Treat only the final path component as the name and reject control chars,
  // traversal components, and names that become empty after sanitization.
  const baseName = fileName.replace(/\\/g, "/").split("/").pop()?.trim() || "";
  if (!baseName || baseName === "." || baseName === "..") {
    throw new Error("Invalid file name");
  }

  const safeName = baseName
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, MAX_FILE_NAME_LENGTH);

  if (!safeName) {
    throw new Error("Invalid file name");
  }

  return safeName;
}

function validateContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  if (!/^video\/[a-z0-9.+-]+$/.test(normalized)) {
    throw new Error("Invalid video content type");
  }
  return normalized;
}

/**
 * Upload a video file to Supabase Storage using the server-only service key.
 * Returns the public URL of the uploaded file.
 */
export async function uploadVideoToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  userId: number,
  contentType = "video/mp4",
): Promise<string> {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error("Invalid video file");
  }

  const safeUserId = validateUserId(userId);
  const safeFileName = sanitizeFileName(fileName);
  const safeContentType = validateContentType(contentType);
  const filePath = `${STORAGE_BUCKET}/${safeUserId}/${Date.now()}-${randomUUID()}-${safeFileName}`;

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: safeContentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  } catch (error) {
    console.error("[Supabase] Video upload error:", error);
    throw error;
  }
}
