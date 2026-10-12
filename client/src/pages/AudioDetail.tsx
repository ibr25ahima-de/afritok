import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  Play,
  Share2,
  Music2,
  VideoIcon,
} from "lucide-react";
import { Loader2 } from "lucide-react";

export default function AudioDetail() {
  const [, params] = useRoute("/audio/:videoId");
  const [, navigate] = useLocation();
  const videoId = params?.videoId ? parseInt(params.videoId) : null;

  const { data: video, isLoading } = trpc.music.getSourceVideo.useQuery(
    { videoId: videoId! },
    { enabled: !!videoId }
  );
  // Les anciennes vidéos contiennent leur son directement dans le fichier vidéo.
  // On réutilise donc cette URL comme source audio de secours.
  const soundUrl = video?.music?.audioUrl || video?.musicUrl || video?.videoUrl || null;
  const soundName = video?.music?.title || video?.musicName || `Son original - ${video?.user?.name || "Artiste"}`;

  // Le serveur filtre par l’URL audio persistée, comme la page d’un son TikTok.
  const { data: relatedVideos = [] } = trpc.music.getVideosBySound.useQuery(
    { videoId: videoId!, limit: 30, offset: 0 },
    { enabled: !!videoId }
  );

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col pb-24">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-black z-50">
        <button onClick={() => window.history.back()} className="p-2 min-h-11 min-w-11 touch-manipulation">
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={() => {
            if (navigator.share) void navigator.share({ title: soundName, text: "Découvre ce son sur biYaloxi" }).catch(() => {});
            else void navigator.clipboard?.writeText(window.location.href);
          }}
          className="p-2 min-h-11 min-w-11 touch-manipulation"
          aria-label="Partager ce son"
        >
          <Share2 size={24} />
        </button>
      </header>

      <div className="px-6 py-4 flex gap-4 items-start">
        <div className="relative group">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden border border-white/10 shadow-xl">
            {video?.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="Couverture du son" className="w-full h-full object-cover opacity-60" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={40} className="text-amber-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                <Play size={20} fill="white" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-bold mb-1">{soundName}</h1>
          <p className="text-gray-400 text-sm mb-3">{relatedVideos.length} vidéo{relatedVideos.length === 1 ? "" : "s"} avec ce son</p>
          <button
            onClick={() => {
              if (navigator.share) void navigator.share({ title: soundName, text: "Découvre ce son sur biYaloxi" }).catch(() => {});
              else void navigator.clipboard?.writeText(window.location.href);
            }}
            className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-white/20 transition"
          >
            <Share2 size={18} />
            Partager ce son
          </button>
        </div>
      </div>

      <div className="flex-1 px-1">
        <div className="grid grid-cols-3 gap-0.5">
          {relatedVideos.map((v) => (
            <div
              key={v.id}
              onClick={() => navigate(`/feed?videoId=${v.id}`)}
              className="aspect-[3/4] bg-gray-900 relative overflow-hidden group cursor-pointer"
            >
              {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
              <div className="absolute bottom-1 left-1 flex items-center gap-2 min-h-11 min-w-11 touch-manipulation text-[10px] font-bold">
                <Play size={10} fill="white" />
                {v.views || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-[calc(1.5rem+var(--afritok-safe-bottom))] left-3 right-3 z-50 flex justify-center">
        <button
          onClick={() => {
            if (soundUrl) navigate(`/upload?audioUrl=${encodeURIComponent(soundUrl)}&audioName=${encodeURIComponent(soundName)}`);
            else navigate("/upload");
          }}
          className="bg-amber-500 text-black px-8 py-3 rounded-full font-black flex items-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform active:scale-95"
        >
          <VideoIcon size={22} fill="black" />
          UTILISER CE SON
        </button>
      </div>
    </div>
  );
}
