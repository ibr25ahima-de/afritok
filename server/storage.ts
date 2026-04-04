import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ FIX

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function storagePut(
  fileKey: string,
  fileBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<{ key: string; url: string }> {
  try {
    const { error } = await supabase.storage
      .from("videos")
      .upload(fileKey, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    // ✅ marche même si bucket privé
    const { data } = await supabase.storage
      .from("videos")
      .createSignedUrl(fileKey, 60 * 60 * 24 * 365); // 1 an

    return {
      key: fileKey,
      url: data?.signedUrl || "",
    };
  } catch (error) {
    console.error("[Storage] Upload failed:", error);
    throw error;
  }
      }
