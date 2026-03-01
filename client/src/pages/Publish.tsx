import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";

export default function Publish() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { file, preview } = useUpload();

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  /** PUBLISH */
  const handlePublish = async () => {
    if (!file || !user) {
      alert("Vidéo manquante");
      return;
    }

    setLoading(true);

    try {
      const fileName = `${user.id}-${Date.now()}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("videos").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: insertError } = await supabase.from("videos").insert({
        userId: user.id,
        videoUrl: publicUrl,
        description: caption,
      });

      if (insertError) throw insertError;

      // sessionStorage.clear(); // Optionnel si plus utilisé

      navigate("/feed");
    } catch (err) {
      console.error(err);
      alert("Erreur upload");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col p-4">
      <h1 className="text-xl font-bold mb-4">Publier vidéo</h1>

      {preview && (
        <video
          src={preview}
          className="w-full h-60 object-cover rounded-lg mb-4"
          autoPlay
          loop
          muted
        />
      )}

      <textarea
        placeholder="Description..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="bg-gray-900 p-3 rounded mb-4"
      />

      <button
        onClick={handlePublish}
        disabled={loading}
        className="w-full bg-red-600 py-3 rounded-lg font-semibold flex justify-center"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Publier"}
      </button>
    </div>
  );
}
