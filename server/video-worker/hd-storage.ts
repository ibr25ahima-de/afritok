import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const bucket = process.env.SUPABASE_VIDEO_BUCKET ?? "videos";

/**
 * Uploads a completed HD transcode to the existing Supabase video bucket.
 * The original source is never replaced; HD files use a distinct object path.
 */
export async function uploadHdVideoToStorage(input: {
  localPath: string;
  userId: number;
  videoId: number;
}): Promise<{ path: string; publicUrl: string }> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials: SUPABASE_URL and a Supabase storage key");
  }

  const client = createClient(supabaseUrl, supabaseKey);
  const fileBuffer = await readFile(input.localPath);
  const path = `${input.userId}/hd/${input.videoId}.mp4`;

  const { error } = await client.storage.from(bucket).upload(path, fileBuffer, {
    contentType: "video/mp4",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw new Error(`HD storage upload failed: ${error.message}`);

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
