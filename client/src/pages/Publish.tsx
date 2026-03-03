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
console.log("USER FROM useAuth:", user);
const { data: sessionData } = await supabase.auth.getSession();
console.log("SESSION FROM SUPABASE:", sessionData);
    if (!file || !user) {
      alert("Vidéo manquante ou utilisateur non connecté");
      return;
    }

    setLoading(true);

    try {
      const fileName = `${user.id}-${Date.now()}.mp4`;

      console.log("✅ Début upload Storage :", fileName);

      // 🔹 Upload dans le bucket Storage
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) {
        console.error("❌ Erreur upload Storage :", uploadError);
        throw uploadError;
      }

      console.log("✅ Upload Storage réussi");

      // 🔹 Récupérer URL publique
      const { data } = supabase.storage.from("videos").getPublicUrl(fileName);
      const publicUrl = data?.publicUrl;

      if (!publicUrl) {
        console.error("❌ Public URL introuvable pour le fichier :", fileName);
        throw new Error("Impossible de récupérer l'URL publique");
      }

      console.log("✅ URL publique :", publicUrl);
console.log("USER ID FRONT:", user?.id);

const { data: sessionData } = await supabase.auth.getSession();
console.log("SESSION SUPABASE:", sessionData);
      // 🔹 Insert dans la table videos
      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id,
        video_url: publicUrl,
        description: caption,
        title: caption,
      });

      if (insertError) {
        console.error("❌ Erreur insertion table videos :", insertError);
        throw insertError;
      }

      console.log("✅ Insertion table videos réussie");

      navigate("/feed");
    } catch (err: any) {
      console.error("💥 Erreur upload complète :", err);
      alert("Erreur upload : " + (err.message ?? JSON.stringify(err)));
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
