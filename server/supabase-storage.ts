import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials: SUPABASE_URL and SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload video file to Supabase Storage
 * Returns the public URL of the uploaded file
 */
export async function uploadVideoToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  userId: number
): Promise<string> {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);
    const filePath = `videos/${userId}/${timestamp}-${random}-${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(filePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("videos")
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  } catch (error) {
    console.error("[Supabase] Upload error:", error);
    throw error;
  }
}
