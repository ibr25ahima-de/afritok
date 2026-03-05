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

  const handlePublish = async () => {
    console.log("🚀 CLICK PUBLISH");

    const { data: sessionData } = await supabase.auth.getSession();
    console.log("SESSION:", sessionData);

    if (!file) {
      alert("Pas de fichier sélectionné");
      return;
    }

    if (!user) {
      alert("Utilisateur non connecté");
      return;
    }

    setLoading(true);

    try {
      const fileName = `${user.id}-${Date.now()}.mp4`;

      console.log("📤 Upload vers storage...");

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) {
        console.error("❌ STORAGE ERROR:", uploadError);
        alert("STORAGE ERROR: " + JSON.stringify(uploadError, null, 2));
        setLoading(false);
        return;
      }

      console.log("✅ STORAGE SUCCESS");
      alert("Upload storage réussi ✅");

      // Pour l’instant on ne fait PAS l’insert en base
      // On teste uniquement le storage

      navigate("/feed");

    } catch (err: any) {
      console.error("💥 FULL ERROR:", err);
      alert("FULL ERROR: " + JSON.stringify(err, null, 2));
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
