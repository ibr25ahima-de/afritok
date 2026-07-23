import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";

export default function Publish() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { file, preview, selectedMusic } = useUpload();

  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Use tRPC mutations
  const uploadFileMutation = trpc.video.uploadFile.useMutation();
  const uploadMutation = trpc.video.upload.useMutation();

  /**
   * Extract a thumbnail frame from a video file using canvas.
   * Seeks to 1 second (or 10% of duration) and draws the frame to a canvas.
   */
  const extractThumbnail = (videoFile: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(videoFile);

      video.onloadeddata = () => {
        // Seek to 1 second or 10% of duration (whichever is smaller)
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } else {
          resolve(null);
        }
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(video.src);
      };
    });
  };

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
      setUploadProgress(10);
      console.log("📤 Préparation du mixage audio...");

      // On garde simplement la musique choisie
      // Le mixage sera fait plus tard côté serveur
      const finalFile = file;

      setUploadProgress(30);
      console.log("📤 Conversion du fichier pour l'envoi...");

      // Convert File to Uint8Array for tRPC transmission
      const arrayBuffer = await finalFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Extract thumbnail from video before uploading
      let thumbnailDataUrl: string | null = null;
      if (file.type.startsWith("video/")) {
        setUploadProgress(40);
        console.log("📸 Extraction de la miniature...");
        thumbnailDataUrl = await extractThumbnail(file);
        if (thumbnailDataUrl) {
          console.log("✅ Miniature extraite avec succès");
        } else {
          console.warn("⚠️ Impossible d'extraire la miniature");
        }
      }

      setUploadProgress(50);
      console.log("📤 Upload vidéo vers Supabase Storage via tRPC...");

      const uploadFileResult = await uploadFileMutation.mutateAsync({
        fileBuffer: buffer,
        fileName: file.name,
        fileType: finalFile.type,
      });

      if (!uploadFileResult.success || !uploadFileResult.videoUrl) {
        throw new Error("Failed to upload file to storage");
      }

      const videoUrl = uploadFileResult.videoUrl;
      console.log("✅ STORAGE SUCCESS:", videoUrl);

      // Upload thumbnail to storage if extracted
      let thumbnailUrl: string | null = null;
      if (thumbnailDataUrl) {
        setUploadProgress(65);
        console.log("📤 Upload de la miniature vers Storage...");
        try {
          const thumbnailBlob = await (await fetch(thumbnailDataUrl)).blob();
          const thumbnailBuffer = new Uint8Array(await thumbnailBlob.arrayBuffer());

          const thumbUploadResult = await uploadFileMutation.mutateAsync({
            fileBuffer: thumbnailBuffer,
            fileName: `thumb-${file.name.replace(/\.[^.]+$/, "")}.jpg`,
            fileType: "image/jpeg",
          });

          if (thumbUploadResult.success && thumbUploadResult.videoUrl) {
            thumbnailUrl = thumbUploadResult.videoUrl;
            console.log("✅ MINIATURE UPLOADED:", thumbnailUrl);
          }
        } catch (thumbErr) {
          console.warn("⚠️ Échec upload miniature:", thumbErr);
        }
      }

      setUploadProgress(80);
      console.log("💾 Sauvegarde des métadonnées en base de données...");

      // Save video metadata via tRPC
      await uploadMutation.mutateAsync({
        title: title.trim(),
        description: caption.trim(),
        videoUrl,
        thumbnailUrl,
        musicUrl: selectedMusic?.url || null,
        musicName: selectedMusic?.name || null,
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
        className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-3 py-3 text-white mb-4 resize-none"
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
