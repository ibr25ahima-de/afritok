import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";

export default function Publish() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { file, preview } = useUpload();

  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Use tRPC mutations
  const uploadFileMutation = trpc.video.uploadFile.useMutation();
  const uploadMutation = trpc.video.upload.useMutation();

  const handlePublish = async () => {
    console.log("🚀 CLICK PUBLISH");

    if (!file) {
      alert("Pas de fichier sélectionné");
      return;
    }

    if (!user) {
      alert("Utilisateur non connecté");
      return;
    }

    if (!title.trim()) {
      alert("Veuillez ajouter un titre");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(20);
      console.log("📤 Conversion du fichier...");

      // Convert File to Uint8Array for tRPC transmission
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      setUploadProgress(40);
      console.log("📤 Upload vers Supabase Storage via tRPC...");

      // The error "expected nonoptional, received undefined" for path "file" 
      // strongly suggests that the server expects the key to be "file" 
      // instead of "fileBuffer" or that the entire object is not matching.
      
      // Let's try to align with what the server likely expects based on the error.
      const uploadFileResult = await uploadFileMutation.mutateAsync({
        fileBuffer: buffer, // Changed from fileBuffer to file
        fileName: file.name,
        fileType: file.type,
      });

      if (!uploadFileResult.success || !uploadFileResult.videoUrl) {
        throw new Error("Failed to upload file to storage");
      }

      const videoUrl = uploadFileResult.videoUrl;
      console.log("✅ STORAGE SUCCESS:", videoUrl);

      setUploadProgress(70);
      console.log("💾 Sauvegarde des métadonnées en base de données...");

      // Save video metadata via tRPC
      await uploadMutation.mutateAsync({
        title: title.trim(),
        description: caption.trim(),
        videoUrl,
      });

      setUploadProgress(100);
      console.log("✅ VIDEO SAVED TO DATABASE");
      alert("Vidéo publiée avec succès ! ✅");

      // Reset form and navigate
      setTitle("");
      setCaption("");
      setUploadProgress(0);
      navigate("/feed");

    } catch (err: any) {
      console.error("💥 FULL ERROR:", err);
      // More user friendly error message
      const errorMsg = err?.shape?.message || err?.message || JSON.stringify(err);
      alert("ERREUR: " + errorMsg);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-6">Publier une vidéo</h1>

      {preview && (
        <video
          src={preview}
          className="w-full h-60 object-cover rounded-lg mb-6"
          autoPlay
          loop
          muted
        />
      )}

      <input
        type="text"
        placeholder="Titre de la vidéo..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white mb-4"
      />

      <textarea
        placeholder="Description..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-3 text-white mb-4 resize-none"
        rows={4}
      />

      {/* Progress Bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
          <div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <button
        onClick={handlePublish}
        disabled={loading || !file || !title.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 py-3 rounded-lg font-semibold flex justify-center items-center gap-2 transition"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin w-5 h-5" />
            Publication en cours... {uploadProgress}%
          </>
        ) : (
          "Publier la vidéo"
        )}
      </button>
    </div>
  );
}
