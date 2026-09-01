import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";
import { PremiumPublishOptions, PremiumPublishOptionsValue } from "@/components/PremiumPublishOptions";

export default function Publish() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { file, preview, selectedMusic } = useUpload();
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [premiumOptions, setPremiumOptions] = useState<PremiumPublishOptionsValue>({ quality: "standard", scheduledAt: null, commentsMode: "all" });

  const uploadFileMutation = trpc.video.uploadFile.useMutation();
  const uploadMutation = trpc.video.upload.useMutation();
  const { data: premiumStatus } = trpc.subscription.status.useQuery(undefined, { staleTime: 60_000 });

  const extractThumbnail = (videoFile: File): Promise<string | null> => new Promise((resolve) => {
    const video = document.createElement("video"); video.preload = "metadata"; video.muted = true; video.playsInline = true; video.src = URL.createObjectURL(videoFile);
    video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
    video.onseeked = () => { const canvas = document.createElement("canvas"); canvas.width = video.videoWidth || 360; canvas.height = video.videoHeight || 640; const ctx = canvas.getContext("2d"); if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", 0.7)); } else resolve(null); URL.revokeObjectURL(video.src); };
    video.onerror = () => { resolve(null); URL.revokeObjectURL(video.src); };
  });

  const handlePublish = async () => {
    if (!file) return alert("Pas de fichier sélectionné");
    if (!user) return alert("Utilisateur non connecté");
    if (!title.trim()) return alert("Veuillez ajouter un titre");
    setLoading(true); setUploadProgress(0);
    try {
      const finalFile = file;
      const buffer = new Uint8Array(await finalFile.arrayBuffer());
      let thumbnailDataUrl: string | null = null;
      if (file.type.startsWith("video/")) { setUploadProgress(40); thumbnailDataUrl = await extractThumbnail(file); }
      setUploadProgress(50);
      const uploadFileResult = await uploadFileMutation.mutateAsync({ fileBuffer: buffer, fileName: file.name, fileType: finalFile.type });
      if (!uploadFileResult.success || !uploadFileResult.videoUrl) throw new Error("Échec de l'envoi de la vidéo vers le stockage");
      const videoUrl = uploadFileResult.videoUrl;
      let thumbnailUrl: string | null = null;
      if (thumbnailDataUrl) {
        try {
          const thumbnailBlob = await (await fetch(thumbnailDataUrl)).blob();
          const thumbnailBuffer = new Uint8Array(await thumbnailBlob.arrayBuffer());
          const thumbUploadResult = await uploadFileMutation.mutateAsync({ fileBuffer: thumbnailBuffer, fileName: `thumb-${file.name.replace(/\.[^.]+$/, "")}.jpg`, fileType: "image/jpeg" });
          if (thumbUploadResult.success && thumbUploadResult.videoUrl) thumbnailUrl = thumbUploadResult.videoUrl;
        } catch (thumbErr) { console.warn("Échec upload miniature:", thumbErr); }
      }
      setUploadProgress(80);
      const result = await uploadMutation.mutateAsync({ title: title.trim(), description: caption.trim(), videoUrl, thumbnailUrl, musicUrl: selectedMusic?.url || null, musicName: selectedMusic?.name || null, premiumOptions: premiumStatus?.isPremium ? premiumOptions : undefined });
      setUploadProgress(100);
      alert(result.success ? (premiumOptions.scheduledAt ? "Vidéo programmée avec succès ! ✅" : "Vidéo publiée avec succès ! ✅") : "Publication impossible");
      setTitle(""); setCaption(""); setUploadProgress(0); navigate("/feed");
    } catch (err: any) {
      console.error("Erreur publication:", err);
      alert("ERREUR: " + (err?.shape?.message || err?.message || JSON.stringify(err)));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-6">Publier une vidéo</h1>
      {preview && <video src={preview} className="w-full h-60 object-cover rounded-lg mb-6" autoPlay loop muted />}
      <input type="text" placeholder="Titre de la vidéo..." value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white mb-4" />
      <textarea placeholder="Description..." value={caption} onChange={e => setCaption(e.target.value)} className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-3 py-3 text-white mb-4 resize-none" rows={4} />
      <PremiumPublishOptions enabled={premiumStatus?.isPremium === true} onChange={setPremiumOptions} />
      {uploadProgress > 0 && uploadProgress < 100 && <div className="w-full bg-slate-700 rounded-full h-2 mb-4"><div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
      <button onClick={handlePublish} disabled={loading || !file || !title.trim()} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 py-3 rounded-lg font-semibold flex justify-center items-center gap-2 transition">
        {loading ? <><Loader2 className="animate-spin w-5 h-5" />Publication en cours... {uploadProgress}%</> : "Publier la vidéo"}
      </button>
    </div>
  );
}
