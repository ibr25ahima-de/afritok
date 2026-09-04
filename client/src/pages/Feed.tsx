import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";
import { GiftSelector } from "@/components/GiftSelector";
import { toast } from "sonner";
import { FlowerIcon, BirdIcon, GemIcon, ButterflyIcon, LionAvatar, BaobabIcon, ElephantIcon, SunIcon, HummingbirdIcon, LeopardIcon, FollowPlusIcon, MuteIcon, UnmuteIcon, SearchIcon, BellIcon } from "@/components/Icons";

interface Video {
  id: number; userId: number; title?: string | null; description: string | null;
  videoUrl: string; thumbnailUrl?: string | null; views: number | null;
  likes: number | null; comments: number | null; shares: number | null;
  favorites: number | null; createdAt: Date;
  user?: { id: number; name: string; avatarUrl?: string };
}

type Counters = { likes: number; comments: number; shares: number; favorites: number };

export default function Feed() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [offset, setOffset] = useState(0);
  const { data: trpcVideos, isLoading: trpcLoading } = trpc.feed.getFeed.useQuery({ limit: 20, offset }, { keepPreviousData: true, staleTime: 5000 });
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [favoritedVideos, setFavoritedVideos] = useState<Set<number>>(new Set());
  const [videoCounters, setVideoCounters] = useState<Record<number, Counters>>({});
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedVideos = useRef(new Set<number>());
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const likeToggleMutation = trpc.like.toggle.useMutation();
  const favoriteToggleMutation = trpc.favorite.toggle.useMutation();
  const incrementViewsMutation = trpc.video.incrementViews.useMutation();
  const deleteVideoMutation = trpc.video.delete.useMutation();
  const utils = trpc.useUtils();
  const videoIds = videos.map(v => v.id);
  const interactionsQuery = trpc.like.getMyForVideos.useQuery(
    { videoIds },
    { enabled: isAuthenticated && videoIds.length > 0, staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true }
  );

  useEffect(() => {
    if (!trpcVideos) return;
    setVideos(prev => {
      if (offset === 0) return trpcVideos as Video[];
      const next = [...prev];
      trpcVideos.forEach(v => { if (!next.some(x => x.id === v.id)) next.push(v as Video); });
      return next;
    });
    setVideoCounters(prev => {
      const next = { ...prev };
      trpcVideos.forEach(v => {
        next[v.id] = { likes: v.likes || 0, comments: v.comments || 0, shares: v.shares || 0, favorites: v.favorites || 0, ...(prev[v.id] || {}) };
      });
      return next;
    });
    setIsFetchingMore(false);
  }, [trpcVideos, offset]);

  // Database is the source of truth for the current user's saved interactions.
  useEffect(() => {
    if (!interactionsQuery.data) return;
    setLikedVideos(new Set(interactionsQuery.data.likedVideoIds || []));
    setFavoritedVideos(new Set(interactionsQuery.data.favoritedVideoIds || []));
  }, [interactionsQuery.data]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setCurrentVideoIndex(index);
        }
      });
    }, { threshold: 0.6 });
    containerRef.current?.querySelectorAll(".video-item").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [videos]);

  useEffect(() => {
    videos.forEach((video, index) => {
      const player = videoRefs.current[video.id];
      if (!player) return;
      if (index === currentVideoIndex) {
        player.muted = muted;
        player.play()?.catch(() => console.log("Autoplay en attente d'interaction"));
        if (!viewedVideos.current.has(video.id)) {
          viewedVideos.current.add(video.id);
          incrementViewsMutation.mutate({ videoId: video.id });
        }
      } else {
        player.pause();
        if (Math.abs(index - currentVideoIndex) > 2) { player.src = ""; player.load(); }
        else if (player.src === "" && video.videoUrl) { player.src = video.videoUrl; player.load(); }
      }
    });
    const nextPlayer = videoRefs.current[videos[currentVideoIndex + 1]?.id];
    if (nextPlayer) nextPlayer.preload = "auto";
  }, [currentVideoIndex, videos, muted]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 1000 && !isFetchingMore) {
      setIsFetchingMore(true); setOffset(prev => prev + 20);
    }
  };

  const handleLike = async (video: Video) => {
    if (!isAuthenticated) { navigate("/"); return; }
    const wasLiked = likedVideos.has(video.id);
    setLikedVideos(prev => { const next = new Set(prev); wasLiked ? next.delete(video.id) : next.add(video.id); return next; });
    setVideoCounters(prev => ({ ...prev, [video.id]: { ...(prev[video.id] || { likes: 0, comments: 0, shares: 0, favorites: 0 }), likes: Math.max(0, (prev[video.id]?.likes || 0) + (wasLiked ? -1 : 1)) } }));
    try {
      const result = await likeToggleMutation.mutateAsync({ videoId: video.id });
      setVideoCounters(prev => ({ ...prev, [video.id]: { ...prev[video.id], likes: result.likes } }));
      await interactionsQuery.refetch();
    } catch { await interactionsQuery.refetch(); }
  };

  const handleFavorite = async (video: Video) => {
    if (!isAuthenticated) { navigate("/"); return; }
    const wasFavorited = favoritedVideos.has(video.id);
    setFavoritedVideos(prev => { const next = new Set(prev); wasFavorited ? next.delete(video.id) : next.add(video.id); return next; });
    setVideoCounters(prev => ({ ...prev, [video.id]: { ...(prev[video.id] || { likes: 0, comments: 0, shares: 0, favorites: 0 }), favorites: Math.max(0, (prev[video.id]?.favorites || 0) + (wasFavorited ? -1 : 1)) } }));
    try {
      const result = await favoriteToggleMutation.mutateAsync({ videoId: video.id });
      setVideoCounters(prev => ({ ...prev, [video.id]: { ...prev[video.id], favorites: result.favorites } }));
      await interactionsQuery.refetch();
    } catch { await interactionsQuery.refetch(); }
  };

  const startVideoLongPress = (video: Video) => {
    if (!isAuthenticated || video.userId !== user?.id) return;
    longPressTimer.current = setTimeout(() => {
      setSelectedVideoId(video.id);
      setShowDeleteDialog(true);
    }, 550);
  };

  const cancelVideoLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideoId || deleteVideoMutation.isPending) return;
    const videoId = selectedVideoId;
    try {
      await deleteVideoMutation.mutateAsync({ videoId });
      setVideos(current => current.filter(video => video.id !== videoId));
      setVideoCounters(current => {
        const next = { ...current };
        delete next[videoId];
        return next;
      });
      setSelectedVideoId(null);
      setShowDeleteDialog(false);
      await utils.feed.getFeed.invalidate();
      toast.success("Vidéo supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La suppression a échoué. Réessaie.");
    }
  };

  if (trpcLoading && videos.length === 0) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-amber-400" size={40} /></div>;

  return (
    <div className="bg-black text-white h-screen overflow-hidden flex flex-col relative">
      <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 py-4 flex items-center justify-between pointer-events-none">
        <h1 className="text-2xl font-black text-amber-400 tracking-tighter pointer-events-auto">AFRITOK</h1>
        <div className="flex items-center gap-4 pointer-events-auto"><button className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><SearchIcon size={22} /></button><button className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><BellIcon size={22} /></button></div>
      </header>
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto snap-y snap-mandatory overscroll-none scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {videos.map((video, i) => {
          const isVisible = Math.abs(i - currentVideoIndex) <= 2;
          const counter = videoCounters[video.id] || { likes: video.likes || 0, comments: video.comments || 0, shares: video.shares || 0, favorites: video.favorites || 0 };
          return <div key={video.id} data-index={i} className="video-item h-screen w-full relative snap-start bg-black flex-shrink-0">
            {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loadedVideos.has(video.id) ? "opacity-0" : "opacity-100"}`} />}
            {isVisible && <video ref={el => { videoRefs.current[video.id] = el; }} src={video.videoUrl} className="w-full h-full object-cover" loop playsInline muted={muted} autoPlay={i === currentVideoIndex} onPointerDown={() => startVideoLongPress(video)} onPointerUp={cancelVideoLongPress} onPointerCancel={cancelVideoLongPress} onPointerLeave={cancelVideoLongPress} onContextMenu={event => event.preventDefault()} onPlaying={() => setLoadedVideos(prev => new Set(prev).add(video.id))} onLoadedData={e => { if (i === currentVideoIndex) e.currentTarget.play().catch(() => {}); }} />}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
            <button onClick={() => setMuted(!muted)} className="absolute top-24 right-4 z-40 p-2 bg-black/30 rounded-full backdrop-blur-md">{muted ? <MuteIcon size={20} /> : <UnmuteIcon size={20} />}</button>
            <div className="absolute right-3 top-32 flex flex-col gap-5 z-40 items-center">
              <div className="relative mb-2"><div onClick={() => navigate(`/profile/${video.userId}`)} className="w-12 h-12 rounded-full border-2 border-amber-400 overflow-hidden bg-amber-900/20 cursor-pointer">{video.user?.avatarUrl ? <img src={video.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><LionAvatar size={24} /></div>}</div><div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 rounded-full p-0.5 text-black"><FollowPlusIcon size={12} /></div></div>
              <button onClick={() => handleLike(video)} className="flex flex-col items-center"><FlowerIcon active={likedVideos.has(video.id)} size={35} /><span className="text-xs font-bold mt-1">{counter.likes}</span></button>
              <button onClick={() => { setSelectedVideoId(video.id); setShowComments(true); }} className="flex flex-col items-center"><BirdIcon size={32} /><span className="text-xs font-bold mt-1">{counter.comments}</span></button>
              <button onClick={() => handleFavorite(video)} className="flex flex-col items-center"><GemIcon active={favoritedVideos.has(video.id)} size={32} /><span className="text-xs font-bold mt-1">{counter.favorites}</span></button>
              <button onClick={() => { if (!isAuthenticated) { navigate("/"); return; } setSelectedVideoId(video.id); setShowGiftSelector(true); }} className="flex flex-col items-center"><span className="text-3xl">🎁</span><span className="text-xs font-bold mt-1">Cadeau</span></button>
              <button onClick={() => { setSelectedVideoId(video.id); setShowShare(true); }} className="flex flex-col items-center"><ButterflyIcon size={32} /><span className="text-xs font-bold mt-1">{counter.shares}</span></button>
              <button onClick={() => navigate(`/audio/${video.id}`)} className="mt-2 hover:scale-110 transition-transform"><div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-900 to-gray-600 border-4 border-gray-800 flex items-center justify-center animate-[spin_3s_linear_infinite]"><div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-black" /></div></button>
            </div>
            <div className="absolute bottom-24 left-4 right-16 z-40"><h3 className="font-black text-lg text-amber-400 drop-shadow-md">@{video.user?.name || "Afritokeur"}</h3><p className="text-sm font-medium text-white line-clamp-2 mt-1 drop-shadow-sm">{video.description}</p><div className="mt-3 flex items-center gap-2"><div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-2"><div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest text-amber-200">Musique Originale</span></div></div></div>
          </div>;
        })}
      </div>
      <nav className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-black/80 backdrop-blur-lg border-t border-white/10 px-6 py-3 flex items-center justify-between z-50">
        <button onClick={() => navigate("/feed")} className="flex flex-col items-center gap-1"><BaobabIcon active={true} size={24} /><span className="text-[10px] font-bold text-amber-400">Accueil</span></button>
        <button onClick={() => navigate("/discover")} className="flex flex-col items-center gap-1 opacity-60"><ElephantIcon size={24} /><span className="text-[10px] font-bold">Amis</span></button>
        <div className="relative -mt-10"><button onClick={() => navigate("/upload")} className="w-14 h-11 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)] border-2 border-white/20"><SunIcon size={28} /></button></div>
        <button onClick={() => navigate("/inbox")} className="flex flex-col items-center gap-1 opacity-60"><HummingbirdIcon size={24} /><span className="text-[10px] font-bold">Inbox</span></button>
        <button onClick={() => navigate(`/profile/${user?.id}`)} className="flex flex-col items-center gap-1 opacity-60"><LeopardIcon size={24} /><span className="text-[10px] font-bold">Profil</span></button>
      </nav>
      {showComments && selectedVideoId && <CommentsModal videoId={selectedVideoId} onClose={() => setShowComments(false)} onCommentAdded={() => setVideoCounters(prev => ({ ...prev, [selectedVideoId]: { ...(prev[selectedVideoId] || { likes: 0, comments: 0, shares: 0, favorites: 0 }), comments: (prev[selectedVideoId]?.comments || 0) + 1 } }))} />}
      {showShare && selectedVideoId && <ShareModal videoId={selectedVideoId} onClose={() => setShowShare(false)} />}
      {showGiftSelector && selectedVideoId && <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"><div className="w-full max-w-md max-h-[85vh] overflow-y-auto"><GiftSelector receiverId={videos.find(v => v.id === selectedVideoId)?.userId ?? 0} videoId={selectedVideoId} onClose={() => setShowGiftSelector(false)} /></div></div>}
      {showDeleteDialog && selectedVideoId && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-5" role="dialog" aria-modal="true" aria-labelledby="delete-video-title"><button type="button" aria-label="Annuler" onClick={() => { setShowDeleteDialog(false); setSelectedVideoId(null); }} className="absolute inset-0 h-full w-full" /><div className="relative z-10 w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 p-5 shadow-2xl"><h2 id="delete-video-title" className="text-lg font-bold">Supprimer la vidéo ?</h2><p className="mt-2 text-sm text-gray-400">Cette action est définitive.</p><button type="button" onClick={handleDeleteVideo} disabled={deleteVideoMutation.isPending} className="mt-5 w-full rounded-xl bg-red-600 px-4 py-3 font-semibold disabled:opacity-50">{deleteVideoMutation.isPending ? "Suppression…" : "Supprimer la vidéo"}</button><button type="button" onClick={() => { setShowDeleteDialog(false); setSelectedVideoId(null); }} disabled={deleteVideoMutation.isPending} className="mt-3 w-full rounded-xl bg-gray-800 px-4 py-3 font-semibold disabled:opacity-50">Annuler</button></div></div>}
    </div>
  );
}
