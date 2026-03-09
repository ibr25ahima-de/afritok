import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with server-side credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Upload file to Supabase Storage (videos bucket)
 * @param fileKey - Path in storage bucket (e.g., "videos/user-123-timestamp.mp4")
 * @param fileBuffer - File content as Buffer or Uint8Array
 * @param contentType - MIME type (e.g., "video/mp4")
 * @returns Object with key and url
 */
export async function storagePut(
  fileKey: string,
  fileBuffer: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  try {
    // Upload to Supabase Storage (videos bucket)
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(fileKey, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("videos")
      .getPublicUrl(fileKey);

    return {
      key: fileKey,
      url: publicData.publicUrl,
    };
  } catch (error) {
    console.error("[Storage] Upload failed:", error);
    throw error;
  }
}

/**
 * Get a presigned URL for downloading a file from Supabase Storage
 * @param fileKey - Path in storage bucket
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Object with key and url
 */
export async function storageGet(
  fileKey: string,
  expiresIn: number = 3600
): Promise<{ key: string; url: string }> {
  try {
    const { data, error } = await supabase.storage
      .from("videos")
      .createSignedUrl(fileKey, expiresIn);

    if (error) {
      throw new Error(`Supabase download error: ${error.message}`);
    }

    return {
      key: fileKey,
      url: data.signedUrl,
    };
  } catch (error) {
    console.error("[Storage] Get URL failed:", error);
    throw error;
  }
}
