import { useEffect, useState, useRef, type TouchEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";
import { GiftSelector } from "@/components/GiftSelector";
import { FlowerIcon, BirdIcon, GemIcon, ButterflyIcon, LionAvatar, BaobabIcon, ElephantIcon, SunIcon, HummingbirdIcon, LeopardIcon, FollowPlusIcon, MuteIcon, UnmuteIcon, SearchIcon, BellIcon } from "@/components/Icons";

interface Video {
  id: number; userId: number; title?: string | null; description: string | null;
  videoUrl: string; mediaType?: "video" | "image"; thumbnailUrl?: string | null;
  musicUrl?: string | null; musicName?: string | null; views: number | null;
  likes: number | null; comments: number | null; shares: number | null;
  favorites: number | null; createdAt: Date;
  user?: { id: number; name: string; avatarUrl?: string };
}

type Counters = { likes: number; comments: number; shares: number; favorites: number };

type FeedLaneId = "forYou" | "latest";
type FeedLane = { id: FeedLaneId; label: string; kind: "forYou" | "latest" };
type FeedLaneState = { videos: Video[]; offset: number; hasMoreVideos: boolean; currentVideoIndex: number; isFetchingMore: boolean };

// Future language/country lanes can be added here without changing swipe handling.
const FEED_LANES: FeedLane[] = [
  { id: "forYou", label: "Pour toi", kind: "forYou" },
  { id: "latest", label: "Nouveautés", kind: "latest" },
];
const INITIAL_LANE_STATE: FeedLaneState = { videos: [], offset: 0, hasMoreVideos: true, currentVideoIndex: 0, isFetchingMore: false };

export default function Feed() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  // The Render-hosted app may run in Chrome on Android (Capacitor reports "web" there).
  // Keep this feature enabled on Android devices in both browser and native app builds.
  const isAndroid = Capacitor.getPlatform() === "android" || (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent));
  const [activeLaneId, setActiveLaneId] = useState<FeedLaneId>("forYou");
  const [laneStates, setLaneStates] = useState<Record<FeedLaneId, FeedLaneState>>({ forYou: { ...INITIAL_LANE_STATE }, latest: { ...INITIAL_LANE_STATE } });
  const [laneSlideDirection, setLaneSlideDirection] = useState<"from-left" | "from-right" | null>(null);
  const laneScrollPositions = useRef<Record<FeedLaneId, number>>({ forYou: 0, latest: 0 });
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const activeLane = FEED_LANES.find(lane => lane.id === activeLaneId)!;
  const activeLaneState = laneStates[activeLaneId];
  const { videos, offset, currentVideoIndex, hasMoreVideos, isFetchingMore } = activeLaneState;
  const updateLane = (id: FeedLaneId, updater: (current: FeedLaneState) => FeedLaneState) => setLaneStates(prev => ({ ...prev, [id]: updater(prev[id]) }));
  const setCurrentVideoIndex = (value: number | ((previous: number) => number)) => updateLane(activeLaneId, current => ({ ...current, currentVideoIndex: typeof value === "function" ? value(current.currentVideoIndex) : value }));
  const { data: trpcVideos, isLoading: trpcLoading, isFetching: trpcFetching, isError: trpcError } = trpc.feed.getFeed.useQuery({ limit: 20, offset, kind: activeLane.kind }, { staleTime: 5000 });
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [favoritedVideos, setFavoritedVideos] = useState<Set<number>>(new Set());
  const [videoCounters, setVideoCounters] = useState<Record<number, Counters>>({});
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());
  const viewedVideos = useRef(new Set<number>());
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const likeToggleMutation = trpc.like.toggle.useMutation();
  const favoriteToggleMutation = trpc.favorite.toggle.useMutation();
  const incrementViewsMutation = trpc.video.incrementViews.useMutation();
  const videoIds = videos.map(v => v.id);
  const interactionsQuery = trpc.like.getMyForVideos.useQuery(
    { videoIds },
    { enabled: isAuthenticated && videoIds.length > 0, staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true }
  );

  useEffect(() => {
    if (!trpcVideos || trpcFetching) return;
    updateLane(activeLaneId, current => {
      const nextVideos = offset === 0 ? trpcVideos as Video[] : [...current.videos];
      if (offset !== 0) (trpcVideos as Video[]).forEach(video => { if (!nextVideos.some(existing => existing.id === video.id)) nextVideos.push(video); });
      return { ...current, videos: nextVideos, hasMoreVideos: trpcVideos.length === 20, isFetchingMore: false };
    });
    setVideoCounters(prev => {
      const next = { ...prev };
      trpcVideos.forEach(v => {
        next[v.id] = { likes: v.likes || 0, comments: v.comments || 0, shares: v.shares || 0, favorites: v.favorites || 0, ...(prev[v.id] || {}) };
      });
      return next;
    });
  }, [trpcVideos, trpcFetching, offset, activeLaneId]);

  useEffect(() => {
    if (trpcError && isFetchingMore) {
      updateLane(activeLaneId, current => ({ ...current, offset: Math.max(0, current.offset - 20), isFetchingMore: false }));
    }
  }, [trpcError, activeLaneId, isFetchingMore]);

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
  }, [videos, activeLaneId]);

  useEffect(() => {
    const savedPosition = laneScrollPositions.current[activeLaneId] || 0;
    if (containerRef.current) containerRef.current.scrollTop = savedPosition;
  }, [activeLaneId]);

  useEffect(() => {
    videos.forEach((video, index) => {
      if (index === currentVideoIndex) {
        if (!viewedVideos.current.has(video.id)) {
          viewedVideos.current.add(video.id);
          incrementViewsMutation.mutate({ videoId: video.id });
        }
      }
      if (video.mediaType === "image") return;
      const player = videoRefs.current[video.id];
      if (!player) return;
      const soundtrack = audioRefs.current[video.id];
      if (index === currentVideoIndex) {
        // If the video has a separate musicUrl track, use that as the single
        // audible source. Muting the video prevents embedded audio + soundtrack
        // from playing together and sounding doubled or distorted.
        player.muted = soundtrack ? true : muted;
        player.play()?.catch(() => console.log("Autoplay en attente d'interaction"));
        if (soundtrack) {
          soundtrack.muted = muted;
          soundtrack.volume = 1;
          if (Math.abs(soundtrack.currentTime - (player.currentTime || 0)) > 0.75) {
            try { soundtrack.currentTime = player.currentTime || 0; } catch { /* wait for audio metadata */ }
          }
          if (!muted && !player.paused && player.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) soundtrack.play().catch(() => console.log("Lecture de la musique en attente d'interaction"));
          else soundtrack.pause();
        }
      } else {
        // Pause off-screen videos without clearing their src. Setting src to an
        // empty string resolves to the current page URL in browsers, and React
        // may not reapply an unchanged src prop when the video becomes visible
        // again. Keeping the original source lets the player resume reliably.
        player.pause();
        soundtrack?.pause();
        if (Math.abs(index - currentVideoIndex) > 2) {
          player.preload = "metadata";
        } else {
          player.preload = "auto";
        }
      }
    });
    const nextPlayer = videoRefs.current[videos[currentVideoIndex + 1]?.id];
    if (nextPlayer) nextPlayer.preload = "auto";
  }, [currentVideoIndex, videos, muted]);

  // Avoid repeated audio seeks: on Android they cause audible crackles and cuts.
  // Only correct substantial drift, and let native media clocks run normally.
  useEffect(() => {
    const active = videos[currentVideoIndex];
    if (!active?.musicUrl || active.mediaType === "image") return;
    const picture = videoRefs.current[active.id];
    const music = audioRefs.current[active.id];
    if (!picture || !music) return;
    const timer = window.setInterval(() => {
      if (picture.paused || picture.ended || muted || document.hidden) {
        music.pause();
        return;
      }
      if (picture.seeking || picture.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (music.readyState >= HTMLMediaElement.HAVE_METADATA &&
          Math.abs(music.currentTime - picture.currentTime) > 1.5) {
        try { music.currentTime = picture.currentTime; } catch {}
      }
      if (music.paused) void music.play().catch(() => {});
    }, 2000);
    return () => { window.clearInterval(timer); music.pause(); };
  }, [currentVideoIndex, videos, muted]);

  const pauseLane = (id: FeedLaneId) => {
    laneStates[id].videos.forEach(video => { videoRefs.current[video.id]?.pause(); audioRefs.current[video.id]?.pause(); });
  };
  const switchLane = (nextId: FeedLaneId, direction: "from-left" | "from-right") => {
    if (!isAndroid || nextId === activeLaneId) return;
    if (containerRef.current) laneScrollPositions.current[activeLaneId] = containerRef.current.scrollTop;
    pauseLane(activeLaneId);
    setLaneSlideDirection(direction);
    setActiveLaneId(nextId);
    window.setTimeout(() => setLaneSlideDirection(null), 260);
  };
  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!isAndroid) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [role=button]")) { touchStart.current = null; return; }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!isAndroid || !touchStart.current) return;
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    const index = FEED_LANES.findIndex(lane => lane.id === activeLaneId);
    const next = dx < 0 ? Math.min(FEED_LANES.length - 1, index + 1) : Math.max(0, index - 1);
    if (next !== index) switchLane(FEED_LANES[next].id, dx < 0 ? "from-right" : "from-left");
  };
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    laneScrollPositions.current[activeLaneId] = scrollTop;
    if (scrollHeight - scrollTop - clientHeight < 1000 && !isFetchingMore && hasMoreVideos && !trpcLoading && !trpcError) {
      updateLane(activeLaneId, current => ({ ...current, isFetchingMore: true, offset: current.offset + 20 }));
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

  if (trpcLoading && videos.length === 0) return <div className="h-[100dvh] min-h-[100dvh] bg-black flex items-center justify-center"><Loader2 className="animate-spin text-amber-400" size={40} /></div>;

  return (
    <div className="bg-black text-white h-[100dvh] min-h-[100dvh] overflow-hidden flex flex-col relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{`@keyframes feedLaneSlideFromLeft { from { opacity: .72; transform: translateX(-22px); } to { opacity: 1; transform: translateX(0); } } @keyframes feedLaneSlideFromRight { from { opacity: .72; transform: translateX(22px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 py-4 flex items-center justify-between pointer-events-none">
        <h1 className="text-2xl font-black text-amber-400 tracking-tighter pointer-events-auto">biYaloxi</h1>
        <div className="flex items-center gap-4 pointer-events-auto"><button className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><SearchIcon size={22} /></button><button className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><BellIcon size={22} /></button></div>
      </header>
      {isAndroid && <div className="absolute top-[68px] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 rounded-full border border-white/15 bg-black/65 p-1 backdrop-blur-md">
        {FEED_LANES.map(lane => <button key={lane.id} type="button" aria-pressed={activeLaneId === lane.id} onClick={() => switchLane(lane.id, lane.id === "latest" ? "from-right" : "from-left")} className={"rounded-full px-4 py-2 text-xs font-bold transition-colors " + (activeLaneId === lane.id ? "bg-amber-400 text-black" : "text-white/75")}>{lane.label}</button>)}
      </div>}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}>
        <div key={activeLaneId} style={{ animation: laneSlideDirection === "from-left" ? "feedLaneSlideFromLeft 220ms ease-out" : laneSlideDirection === "from-right" ? "feedLaneSlideFromRight 220ms ease-out" : undefined }}>
        {trpcError && videos.length === 0 && <div className="h-full min-h-[100dvh] flex items-center justify-center px-8 text-center"><div><p className="text-amber-400 font-bold text-lg">Impossible de charger les vidéos</p><p className="text-gray-400 text-sm mt-2">Le fil principal n’a pas reçu les vidéos. Réessaie dans quelques secondes.</p></div></div>}
        {!trpcError && !trpcLoading && videos.length === 0 && <div className="h-full min-h-[100dvh] flex items-center justify-center px-8 text-center"><div><p className="text-white font-bold text-lg">Aucune vidéo dans le fil</p><p className="text-gray-400 text-sm mt-2">Les vidéos publiques apparaîtront ici.</p></div></div>}
        {videos.map((video, i) => {
          const isVisible = Math.abs(i - currentVideoIndex) <= 2;
          const counter = videoCounters[video.id] || { likes: video.likes || 0, comments: video.comments || 0, shares: video.shares || 0, favorites: video.favorites || 0 };
          return <div key={video.id} data-index={i} className="video-item h-[100dvh] min-h-[100dvh] w-full relative snap-start bg-black flex-shrink-0">
            {isVisible && video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" loading="lazy" decoding="async" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loadedVideos.has(video.id) ? "opacity-0" : "opacity-100"}`} />}
            {isVisible && (video.mediaType === "image" ? <img src={video.videoUrl} alt={video.title || "Photo"} className="w-full h-full object-cover" /> : <>
              <video
                ref={el => { videoRefs.current[video.id] = el; }}
                src={video.videoUrl}
                className="w-full h-full object-cover"
                style={{ touchAction: "pan-y" }}
                loop
                playsInline
                preload={i === currentVideoIndex ? "auto" : "metadata"}
                muted={muted}
                autoPlay={i === currentVideoIndex}
                onPlaying={e => {
                  setLoadedVideos(prev => new Set(prev).add(video.id));
                  const soundtrack = audioRefs.current[video.id];
                  if (soundtrack) {
                    if (Math.abs(soundtrack.currentTime - e.currentTarget.currentTime) > 1.5) {
                      try { soundtrack.currentTime = e.currentTarget.currentTime; } catch {}
                    }
                    if (!muted) void soundtrack.play().catch(() => {});
                  }
                }}
                onLoadedMetadata={e => { if (i === currentVideoIndex) { e.currentTarget.muted = !!video.musicUrl || muted; e.currentTarget.play().catch(() => {}); } }}
                onLoadedData={e => { if (i === currentVideoIndex) { e.currentTarget.muted = !!video.musicUrl || muted; e.currentTarget.play().catch(() => {}); } }}
                onPlay={() => {
                  const soundtrack = audioRefs.current[video.id];
                  const picture = videoRefs.current[video.id];
                  if (soundtrack && picture && !muted && picture.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) void soundtrack.play().catch(() => {});
                }}
                onWaiting={() => audioRefs.current[video.id]?.pause()}
                onStalled={() => audioRefs.current[video.id]?.pause()}
                onSeeking={() => audioRefs.current[video.id]?.pause()}
                onSeeked={e => {
                  const soundtrack = audioRefs.current[video.id];
                  if (soundtrack) {
                    try { soundtrack.currentTime = e.currentTarget.currentTime; } catch {}
                    if (!muted && !e.currentTarget.paused && e.currentTarget.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) void soundtrack.play().catch(() => {});
                  }
                }}
                onEnded={() => {
                  const soundtrack = audioRefs.current[video.id];
                  if (soundtrack) { soundtrack.pause(); soundtrack.currentTime = 0; }
                }}
                onPause={() => audioRefs.current[video.id]?.pause()}
              />
              {video.musicUrl && <audio ref={el => { audioRefs.current[video.id] = el; }} src={video.musicUrl} preload="auto" loop />}
            </>)}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
            <button onClick={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              const soundtrack = audioRefs.current[video.id];
              const player = videoRefs.current[video.id];
              if (soundtrack) {
                soundtrack.muted = nextMuted;
                if (nextMuted) soundtrack.pause();
                else soundtrack.play().catch(() => {});
              }
              if (player) player.muted = !!video.musicUrl || nextMuted;
            }} className="absolute top-24 right-4 z-40 p-2 bg-black/30 rounded-full backdrop-blur-md">{muted ? <MuteIcon size={20} /> : <UnmuteIcon size={20} />}</button>
            <div className="absolute right-3 top-32 flex flex-col gap-5 z-40 items-center">
              <div className="relative mb-2"><div onClick={() => navigate(`/profile/${video.userId}`)} className="w-12 h-12 rounded-full border-2 border-amber-400 overflow-hidden bg-amber-900/20 cursor-pointer">{video.user?.avatarUrl ? <img src={video.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><LionAvatar size={24} /></div>}</div><div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 rounded-full p-0.5 text-black"><FollowPlusIcon size={12} /></div></div>
              <button onClick={() => handleLike(video)} className="flex flex-col items-center"><FlowerIcon active={likedVideos.has(video.id)} size={35} /><span className="text-xs font-bold mt-1">{counter.likes}</span></button>
              <button onClick={() => { setSelectedVideoId(video.id); setShowComments(true); }} className="flex flex-col items-center"><BirdIcon size={32} /><span className="text-xs font-bold mt-1">{counter.comments}</span></button>
              <button onClick={() => handleFavorite(video)} className="flex flex-col items-center"><GemIcon active={favoritedVideos.has(video.id)} size={32} /><span className="text-xs font-bold mt-1">{counter.favorites}</span></button>
              <button onClick={() => { if (!isAuthenticated) { navigate("/"); return; } setSelectedVideoId(video.id); setShowGiftSelector(true); }} className="flex flex-col items-center"><span className="text-3xl">🎁</span><span className="text-xs font-bold mt-1">Cadeau</span></button>
              <button onClick={() => { setSelectedVideoId(video.id); setShowShare(true); }} className="flex flex-col items-center"><ButterflyIcon size={32} /><span className="text-xs font-bold mt-1">{counter.shares}</span></button>
              <button onClick={() => navigate(`/audio/${video.id}`)} className="mt-2 hover:scale-110 transition-transform"><div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-900 to-gray-600 border-4 border-gray-800 flex items-center justify-center animate-[spin_3s_linear_infinite]"><div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-black" /></div></button>
            </div>
            <div className="absolute bottom-24 left-4 right-16 z-40"><h3 className="font-black text-lg text-amber-400 drop-shadow-md">@{video.user?.name || "Utilisateur"}</h3><p className="text-sm font-medium text-white line-clamp-2 mt-1 drop-shadow-sm">{video.description}</p><div className="mt-3 flex items-center gap-2"><div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-2"><div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest text-amber-200">Musique Originale</span></div></div></div>
          </div>;
        })}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-[200] min-h-[68px] bg-black/95 backdrop-blur-lg border-t border-white/20 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md items-end justify-between gap-1">
          <button onClick={() => navigate("/feed")} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1"><BaobabIcon active={true} size={21} /><span className="truncate text-[9px] font-bold text-amber-400">Accueil</span></button>
          <button onClick={() => navigate("/discover")} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 opacity-60"><ElephantIcon size={21} /><span className="truncate text-[9px] font-bold">Amis</span></button>
          <div className="relative -mt-6 flex flex-1 justify-center"><button aria-label="Créer une vidéo" onClick={() => navigate("/upload")} className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/20 bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_20px_rgba(251,191,36,0.4)]"><SunIcon size={24} /></button></div>
          <button onClick={() => navigate("/inbox")} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 opacity-60"><HummingbirdIcon size={21} /><span className="truncate text-[9px] font-bold">Inbox</span></button>
          <button onClick={() => navigate(`/profile/${user?.id}`)} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 opacity-60"><LeopardIcon size={21} /><span className="truncate text-[9px] font-bold">Profil</span></button>
        </div>
      </nav>
      {showComments && selectedVideoId && <CommentsModal videoId={selectedVideoId} onClose={() => setShowComments(false)} onCommentAdded={(commentCount) => setVideoCounters(prev => ({ ...prev, [selectedVideoId]: { ...(prev[selectedVideoId] || { likes: 0, comments: 0, shares: 0, favorites: 0 }), comments: commentCount } }))} />}
      {showShare && selectedVideoId && <ShareModal videoId={selectedVideoId} onClose={() => setShowShare(false)} />}
      {showGiftSelector && selectedVideoId && <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"><div className="w-full max-w-md max-h-[85vh] overflow-y-auto"><GiftSelector receiverId={videos.find(v => v.id === selectedVideoId)?.userId ?? 0} videoId={selectedVideoId} onClose={() => setShowGiftSelector(false)} /></div></div>}
    </div>
  );
}
