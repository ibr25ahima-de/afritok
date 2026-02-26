import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Publish({ file }: { file: File }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    if (!file || !user) return;

    setLoading(true);

    try {
      /** ================= UPLOAD STORAGE ================= */
      const fileName = `${user.id}-${Date.now()}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      /** ================= GET PUBLIC URL ================= */
      const { data } = supabase.storage.from("videos").getPublicUrl(fileName);

      const videoUrl = data.publicUrl;

      /** ================= INSERT DB ================= */
      const { error: insertError } = await supabase.from("videos").insert({
        userId: user.id,
        videoUrl,
        description: caption,
      });

      if (insertError) throw insertError;

      /** ================= DONE ================= */
      navigate("/feed");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col p-4">
      <h1 className="text-xl font-bold mb-4">Publier vidéo</h1>

      <textarea
        placeholder="Description..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="bg-gray-900 p-3 rounded mb-4"
      />

      <button
        onClick={handlePublish}
        disabled={loading}
        className="bg-red-600 py-3 rounded font-semibold flex items-center justify-center"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Publier"}
      </button>
    </div>
  );
      }
