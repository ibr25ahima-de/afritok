import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Globe2, Users, Lock } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";
import { PremiumPublishOptions, PremiumPublishOptionsValue } from "@/components/PremiumPublishOptions";

type VideoVisibility = "public" | "followers" | "private";

export default function Publish() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { file, preview, selectedMusic } = useUpload();
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [visibility, setVisibility] = useState<VideoVisibility>("public");
  const [premiumOptions, setPremiumOptions] = useState<PremiumPublishOptionsValue>({ quality: "standard", scheduledAt: null, commentsMode: "all" });

  const uploadMutation = trpc.video.upload.useMutation();
  const uploadFileMutation = trpc.video.uploadFile.useMutation();
  const { data: premiumStatus } = trpc.subscription.status.useQuery(undefined, { staleTime: 60_000 });

  const extractThumbnail = (videoFile: File): Promise<string | null> => new Promise((resolve) => {
    const video = document.createElement("video"); video.preload = "metadata"; video.muted = true; video.playsInline = true; video.src = URL.createObjectURL(videoFile);
    video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
    video.onseeked = () => { const canvas = document.createElement("canvas"); canvas.width = video.videoWidth || 360; canvas.height = video.videoHeight || 640; const ctx = canvas.getContext("2d"); if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", 0.7)); } else resolve(null); URL.revokeObjectURL(video.src); };
    video.onerror = () => { resolve(null); URL.revokeObjectURL(video.src); };
  });

  const uploadVideoDirect = (videoFile: File): Promise<string> => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-video", true);
    xhr.withCredentials = true;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) setUploadProgress(Math.min(75, 50 + Math.round((event.loaded / event.total) * 25)));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && body.videoUrl) resolve(body.videoUrl);
        else reject(new Error(body.error || body.message || "Échec de l'envoi de la vidéo"));
      } catch { reject(new Error("Réponse invalide du serveur pendant l'envoi de la vidéo")); }
    };
    xhr.onerror = () => reject(new Error("Connexion impossible pendant l'envoi de la vidéo"));
    xhr.onabort = () => reject(new Error("Envoi de la vidéo interrompu"));
    const form = new FormData();
    form.append("file", videoFile, videoFile.name || "video.webm");
    xhr.send(form);
  });

  const handlePublish = async () => {
    if (!file) return alert("Pas de fichier sélectionné");
    if (!user) return alert("Utilisateur non connecté");
    if (!title.trim()) return alert("Veuillez ajouter un titre");
    setLoading(true); setUploadProgress(0);
    try {
      let thumbnailDataUrl: string | null = null;
      if (file.type.startsWith("video/")) { setUploadProgress(10); thumbnailDataUrl = await extractThumbnail(file); }
      setUploadProgress(50);
      const videoUrl = await uploadVideoDirect(file);
      setUploadProgress(80);
      let thumbnailUrl: string | null = null;
      if (thumbnailDataUrl) {
        try {
          const thumbnailBlob = await (await fetch(thumbnailDataUrl)).blob();
          const thumbnailBuffer = new Uint8Array(await thumbnailBlob.arrayBuffer());
          const thumbUploadResult = await uploadFileMutation.mutateAsync({ fileBuffer: thumbnailBuffer, fileName: `thumb-${file.name.replace(/\.[^.]+$/, "")}.jpg`, fileType: "image/jpeg" });
          if (thumbUploadResult.success && thumbUploadResult.videoUrl) thumbnailUrl = thumbUploadResult.videoUrl;
        } catch (thumbErr) { console.warn("Échec upload miniature:", thumbErr); }
      }
      setUploadProgress(90);
      const result = await uploadMutation.mutateAsync({ title: title.trim(), description: caption.trim(), videoUrl, thumbnailUrl, musicUrl: selectedMusic?.url || null, musicName: selectedMusic?.name || null, visibility, premiumOptions: premiumStatus?.isPremium ? premiumOptions : undefined });
      setUploadProgress(100);
      alert(result.success ? (premiumOptions.scheduledAt ? "Vidéo programmée avec succès ! ✅" : "Vidéo publiée avec succès ! ✅") : "Publication impossible");
      setTitle(""); setCaption(""); setVisibility("public"); setUploadProgress(0); navigate("/feed");
    } catch (err: any) {
      console.error("Erreur publication:", err);
      alert("ERREUR: " + (err?.shape?.message || err?.message || JSON.stringify(err)));
    } finally { setLoading(false); }
  };

  const visibilityOptions = [
    { value: "public" as const, label: "Tout le monde", description: "Tous les utilisateurs peuvent voir cette vidéo", icon: Globe2 },
    { value: "followers" as const, label: "Mes abonnés uniquement", description: "Seuls tes abonnés peuvent voir cette vidéo", icon: Users },
    { value: "private" as const, label: "Moi uniquement", description: "Seul toi peux voir cette vidéo", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-6">Publier une vidéo</h1>
      {preview && <video src={preview} className="w-full h-60 object-cover rounded-lg mb-6" autoPlay loop muted />}
      <input type="text" placeholder="Titre de la vidéo..." value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white mb-4" />
      <textarea placeholder="Description..." value={caption} onChange={e => setCaption(e.target.value)} className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-3 py-3 text-white mb-4 resize-none" rows={4} />

      <section className="mb-5">
        <div className="mb-2">
          <h2 className="text-base font-semibold">Qui peut voir cette vidéo ?</h2>
          <p className="text-xs text-slate-300 mt-1">Ce choix s'applique uniquement à cette vidéo.</p>
        </div>
        <div className="space-y-2">
          {visibilityOptions.map(option => {
            const Icon = option.icon;
            const selected = visibility === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setVisibility(option.value)}
                disabled={loading}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${selected ? "border-purple-400 bg-purple-600/20" : "border-slate-700 bg-slate-800/70 hover:bg-slate-800"}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-purple-600" : "bg-slate-700"}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-xs text-slate-300 mt-0.5">{option.description}</span>
                </span>
                <span className={`h-5 w-5 rounded-full border flex items-center justify-center ${selected ? "border-purple-400" : "border-slate-500"}`}>
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <PremiumPublishOptions enabled={premiumStatus?.isPremium === true} onChange={setPremiumOptions} />
      {uploadProgress > 0 && uploadProgress < 100 && <div className="w-full bg-slate-700 rounded-full h-2 mb-4"><div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
      <button onClick={handlePublish} disabled={loading || !file || !title.trim()} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 py-3 rounded-lg font-semibold flex justify-center items-center gap-2 transition">
        {loading ? <><Loader2 className="animate-spin w-5 h-5" />Publication en cours... {uploadProgress}%</> : "Publier la vidéo"}
      </button>
    </div>
  );
}
