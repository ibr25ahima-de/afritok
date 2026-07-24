import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { 
  ChevronLeft, 
  Play, 
  Share2, 
  Bookmark, 
  Music2,
  VideoIcon
} from "lucide-react";
import { Loader2 } from "lucide-react";

export default function AudioDetail() {
  const [match, params] = useRoute("/audio/:videoId");
  const [, navigate] = useLocation();
  const videoId = params?.videoId ? parseInt(params.videoId) : null;

  // On récupère les détails de la vidéo pour avoir les infos du son
  const { data: video, isLoading } = trpc.video.getById.useQuery(
    { id: videoId! },
    { enabled: !!videoId }
  );

  // On récupère d'autres vidéos qui pourraient utiliser le même "style" ou son
  const { data: relatedVideos } = trpc.feed.getFeed.useQuery({
    limit: 12,
    offset: 0
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-24">
      {/* HEADER */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-black z-50">
        <button onClick={() => window.history.back()} className="p-1">
          <ChevronLeft size={28} />
        </button>
        <div className="flex gap-4">
          <button className="p-1"><Share2 size={24} /></button>
        </div>
      </header>

      {/* AUDIO INFO */}
      <div className="px-6 py-4 flex gap-4 items-start">
        <div className="relative group">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden border border-white/10 shadow-xl">
            {video?.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="Audio cover" className="w-full h-full object-cover opacity-60" />
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
          <h1 className="text-xl font-bold mb-1">Son original - {video?.user?.name || "Artiste"}</h1>
          <p className="text-gray-400 text-sm mb-3">1.2M de vidéos</p>
          <button className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-white/20 transition">
            <Bookmark size={18} />
            Ajouter aux favoris
          </button>
        </div>
      </div>

      {/* GRID DES VIDÉOS */}
      <div className="flex-1 px-1">
        <div className="grid grid-cols-3 gap-0.5">
          {relatedVideos?.map((v) => (
            <div 
              key={v.id} 
              onClick={() => navigate(`/feed`)}
              className="aspect-[3/4] bg-gray-900 relative overflow-hidden group cursor-pointer"
            >
              {v.thumbnailUrl && (
                <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] font-bold">
                <Play size={10} fill="white" />
                {v.views || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOUTON "UTILISER CE SON" */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => navigate("/upload")}
          className="bg-amber-500 text-black px-8 py-3 rounded-full font-black flex items-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform active:scale-95"
        >
          <VideoIcon size={22} fill="black" />
          UTILISER CE SON
        </button>
      </div>
    </div>
  );
}
