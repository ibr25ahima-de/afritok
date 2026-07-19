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
    console.log("📤 Uploading:", fileKey);

    const { error } = await supabase.storage
      .from("videos")
      .upload(fileKey, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("❌ Supabase upload error:", error);
      throw error;
    }

    // ✅ URL publique (simple et rapide)
    const { data } = supabase.storage
      .from("videos")
      .getPublicUrl(fileKey);

    return {
      key: fileKey,
      url: data.publicUrl,
    };
  } catch (error) {
    console.error("[Storage] Upload failed:", error);
    throw error;
  }
}

export async function storageList(bucket: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list("Untitled folder", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) throw error;

  return (data || []).map((file) => {
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(`Untitled folder/${file.name}`);

    return {
      name: file.name,
      url: publicUrl.publicUrl,
    };
  });
}
