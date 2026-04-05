import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;

// ✅ fallback intelligent
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

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

    // ✅ URL publique (ou signée si privé)
    const { data } = await supabase.storage
      .from("videos")
      .createSignedUrl(fileKey, 60 * 60 * 24 * 365);

    return {
      key: fileKey,
      url: data?.signedUrl || "",
    };
  } catch (error) {
    console.error("[Storage] Upload failed:", error);
    throw error;
  }
        }
