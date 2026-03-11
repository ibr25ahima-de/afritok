import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2, User, Loader2, Search, PlusSquare, Bell, Bookmark } from "lucide-react";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";

/** ================= TYPES ================= */
interface Video {
  id: number;
  userId: number;
  title: string | null;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  favorites: number | null;
  createdAt: Date;
}

export default function Feed() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  /** ================= STATE ================= */
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [heartVideoId, setHeartVideoId] = useState<number | null>(null);
  const [tab, setTab] = useState<"forYou" | "following">("forYou");
const [muted, setMuted] = useState(true);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [favoritedVideos, setFavoritedVideos] = useState<Set<number>>(new Set());
  const [videoCounters, setVideoCounters] = useState<Record<number, { likes: number; comments: number; shares: number; favorites: number }>>({});

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastTapRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /** ================= API ================= */
  const feedQuery = trpc.video.feed.useQuery({ limit: 20, offset, tab });
  const likeToggleMutation = trpc.like.toggle.useMutation();
  const favoriteToggleMutation = trpc.favorite.toggle.useMutation();
  const incrementViewsMutation = trpc.video.incrementViews.useMutation();

  /** ================= LOAD FEED ================= */
  useEffect(() => {
    const incoming = feedQuery.data;
    if (!incoming) return;

    const data: Video[] = Array.isArray(incoming)
      ? incoming
      : Array.isArray((incoming as any)?.videos)
      ? (incoming as any).videos
      : [];

    setVideos((prev) => {
      const newOnes = data.filter((v) => !prev.some((p) => p.id === v.id));
      return [...prev, ...newOnes];
    });

    // Initialize counters
    data.forEach((video) => {
      setVideoCounters((prev) => ({
        ...prev,
        [video.id]: {
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          favorites: video.favorites || 0,
        },
      }));
    });
  }, [feedQuery.data]);

  /** ================= AUTOPLAY ================= */
  useEffect(() => {
    const current = videos[currentVideoIndex];
    if (!current) return;

    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (el && parseInt(id) !== current.id) el.pause();
    });

    const el = videoRefs.current[current.id];
    el?.play().catch(() => {});
  }, [currentVideoIndex, videos]);

  /** ================= VIEW COUNT ================= */
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = Number((entry.target as HTMLElement).dataset.videoId);
          if (id) incrementViewsMutation.mutate({ videoId: id });
        });
      },
      { threshold: 0.6 }
    );

    const els = containerRef.current.querySelectorAll("video");
    els.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [videos]);

  /** ================= PAGINATION ================= */
  useEffect(() => {
    if (currentVideoIndex >= videos.length - 3 && !feedQuery.isLoading) {
      setOffset((o) => o + 20);
    }
  }, [currentVideoIndex, videos.length]);

  /** ================= AUTH ================= */
  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  /** ================= LIKE ================= */
  const handleLike = async (video: Video) => {
    const wasLiked = likedVideos.has(video.id);
    const newLikedVideos = new Set(likedVideos);

    if (wasLiked) {
      newLikedVideos.delete(video.id);
    } else {
      newLikedVideos.add(video.id);
    }

    setLikedVideos(newLikedVideos);
    setVideoCounters((prev) => ({
      ...prev,
      [video.id]: {
        ...prev[video.id],
        likes: (prev[video.id]?.likes || 0) + (wasLiked ? -1 : 1),
      },
    }));

    try {
      await likeToggleMutation.mutateAsync({ videoId: video.id });
    } catch {
      // Revert on error
      setLikedVideos(likedVideos);
    }
  };

  /** ================= FAVORITE ================= */
  const handleFavorite = async (video: Video) => {
    const wasFavorited = favoritedVideos.has(video.id);
    const newFavoritedVideos = new Set(favoritedVideos);

    if (wasFavorited) {
      newFavoritedVideos.delete(video.id);
    } else {
      newFavoritedVideos.add(video.id);
    }

    setFavoritedVideos(newFavoritedVideos);
    setVideoCounters((prev) => ({
      ...prev,
      [video.id]: {
        ...prev[video.id],
        favorites: (prev[video.id]?.favorites || 0) + (wasFavorited ? -1 : 1),
      },
    }));

    try {
      await favoriteToggleMutation.mutateAsync({ videoId: video.id });
    } catch {
      // Revert on error
      setFavoritedVideos(favoritedVideos);
    }
  };

  /** ================= DOUBLE TAP ================= */
  const handleVideoTap = (video: Video) => {
  const now = Date.now();

  // double tap = like
  if (now - lastTapRef.current < 300) {
    handleLike(video);
    setHeartVideoId(video.id);
    setTimeout(() => setHeartVideoId(null), 900);
  } else {
    // single tap = pause / play
    const el = videoRefs.current[video.id];
    if (!el) return;

    if (el.paused) {
      el.play();
    } else {
      el.pause();
    }
  }

  lastTapRef.current = now;
};
  /** ================= SWIPE ================= */
  const handleSwipe = useCallback(
    (start: number, end: number) => {
      const distance = start - end;
      if (distance > 50 && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex((p) => p + 1);
      }
      if (distance < -50 && currentVideoIndex > 0) {
        setCurrentVideoIndex((p) => p - 1);
      }
    },
    [currentVideoIndex, videos.length]
  );

  const currentVideo = videos[currentVideoIndex];
  const currentCounters = currentVideo ? videoCounters[currentVideo.id] : null;

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur">
        <div className="flex justify-between items-center px-4 py-3">
          <Search onClick={() => navigate("/search")} className="cursor-pointer" />

          <div className="flex gap-6 text-white font-semibold">
            <button
              onClick={() => setTab("following")}
              className={tab === "following" ? "opacity-100 border-b-2 border-white pb-1" : "opacity-50"}
            >
              Following
            </button>
            <button
              onClick={() => setTab("forYou")}
              className={tab === "forYou" ? "opacity-100 border-b-2 border-white pb-1" : "opacity-50"}
            >
              For You
            </button>
          </div>

          <Bell onClick={() => navigate("/notifications")} className="cursor-pointer" />
        </div>
      </header>

      {/* FEED */}
      <div
        ref={containerRef}
        className="pt-16 pb-20 h-screen overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
        onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientY)}
        onTouchEnd={(e) => handleSwipe(touchStart, e.changedTouches[0].clientY)}
      >
        {videos.length === 0 ? (
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          videos.map((video, i) => (
            <div key={video.id} className="h-screen" style={{ scrollSnapAlign: "start" }}>
              <div className="relative w-full h-full">
                <video
  ref={(el) => (videoRefs.current[video.id] = el)}
  data-video-id={video.id}
  src={video.videoUrl}
  className="w-full h-full object-cover"
  loop
  autoPlay={i === currentVideoIndex}
  onClick={() => handleVideoTap(video)}
  muted={muted}
/>
 <button
  onClick={() => setMuted(!muted)}
  className="absolute top-20 right-4 bg-black/60 p-2 rounded-full"
>
  {muted ? "🔇" : "🔊"}
</button>               
                {heartVideoId === video.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Heart className="text-white animate-ping" size={120} fill="white" />
                  </div>
                )}

                {/* LEFT INFO */}
                <div className="absolute bottom-24 left-4 space-y-1 max-w-[70%]">
                  <p className="font-semibold text-sm">@user{video.userId}</p>
                  <p className="text-sm opacity-90 line-clamp-2">{video.description || "Afritok video"}</p>
                  <p className="text-xs opacity-70">🎵 Original sound</p>
                </div>

                {/* RIGHT SIDEBAR - INTERACTION BUTTONS */}
                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6">
                  {/* User Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 border-2 border-white flex items-center justify-center cursor-pointer hover:scale-110 transition">
                    <User size={24} />
                  </div>

                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(video)}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition"
                  >
                    <Heart
                      size={32}
                      fill={likedVideos.has(video.id) ? "red" : "none"}
                      color={likedVideos.has(video.id) ? "red" : "white"}
                      className="cursor-pointer"
                    />
                    <p className="text-xs font-semibold">{currentCounters?.likes || 0}</p>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={() => {
                      setCurrentVideoIndex(i);
                      setShowComments(true);
                    }}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition"
                  >
                    <MessageCircle size={32} className="cursor-pointer" />
                    <p className="text-xs font-semibold">{currentCounters?.comments || 0}</p>
                  </button>

                  {/* Favorite/Bookmark Button */}
                  <button
                    onClick={() => handleFavorite(video)}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition"
                  >
                    <Bookmark
                      size={32}
                      fill={favoritedVideos.has(video.id) ? "white" : "none"}
                      className="cursor-pointer"
                    />
                    <p className="text-xs font-semibold">{currentCounters?.favorites || 0}</p>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => {
                      setCurrentVideoIndex(i);
                      setShowShare(true);
                    }}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition"
                  >
                    <Share2 size={32} className="cursor-pointer" />
                    <p className="text-xs font-semibold">{currentCounters?.shares || 0}</p>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around py-3">
        <button onClick={() => navigate("/feed")} className="hover:text-red-500 transition">
          Home
        </button>
        <button onClick={() => navigate("/search")} className="hover:text-red-500 transition">
          Search
        </button>
        <button onClick={() => navigate("/upload")} className="hover:text-red-500 transition">
          <PlusSquare size={32} />
        </button>
        <button onClick={() => navigate("/notifications")} className="hover:text-red-500 transition">
          Inbox
        </button>
        <button onClick={() => navigate(`/profile/${user?.id}`)} className="hover:text-red-500 transition">
          Profile
        </button>
      </nav>

      {currentVideo && <CommentsModal videoId={currentVideo.id} isOpen={showComments} onClose={() => setShowComments(false)} />}
      {currentVideo && <ShareModal videoTitle={currentVideo.title || ""} videoUrl={currentVideo.videoUrl} isOpen={showShare} onClose={() => setShowShare(false)} />}
    </div>
  );
}
