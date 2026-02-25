import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2, User, Loader2, Search, PlusSquare, Bell } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";
import { useRealtimeFeed } from "@/hooks/useRealtimeFeed";
import { useUserLikes } from "@/hooks/useUserLikes";

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
  const [feedMode, setFeedMode] = useState<"forYou" | "following">("forYou");
  const [tab, setTab] = useState<"forYou" | "following">("forYou");

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /** ================= API ================= */
  const feedQuery = trpc.video.feed.useQuery({ limit: 20, offset, tab });
  const likeToggleMutation = trpc.like.toggle.useMutation();
  const incrementViewsMutation = trpc.video.incrementViews.useMutation();

  const { likedVideos, toggleLike, isLoading: isLoadingLikes } = useUserLikes(
    videos,
    isAuthenticated
  );

  useRealtimeFeed(videos, setVideos);

  /** ================= LOAD FEED ================= */
  useEffect(() => {
    const incoming = feedQuery.data;

    if (!incoming) return;

    const data: Video[] = Array.isArray(incoming)
      ? incoming
      : Array.isArray((incoming as any)?.videos)
      ? (incoming as any).videos
      : [];

    if (!Array.isArray(data)) return;

    setVideos((prev) => {
      const newOnes = data.filter((v) => !prev.some((p) => p.id === v.id));
      return [...prev, ...newOnes];
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
    const wasLiked = likedVideos.has(video.id as any);
    toggleLike(video.id as any);

    setVideos((prev) =>
      prev.map((v) =>
        v.id === video.id ? { ...v, likes: (v.likes || 0) + (wasLiked ? -1 : 1) } : v
      )
    );

    try {
      await likeToggleMutation.mutateAsync({ videoId: video.id });
    } catch {
      toggleLike(video.id as any);
    }
  };

  /** ================= SWIPE ================= */
  const handleSwipe = useCallback(
    (start: number, end: number) => {
      const distance = start - end;

      if (distance > 50 && currentVideoIndex < videos.length - 1)
        setCurrentVideoIndex((p) => p + 1);

      if (distance < -50 && currentVideoIndex > 0)
        setCurrentVideoIndex((p) => p - 1);
    },
    [currentVideoIndex, videos.length]
  );

  const lastTapRef = useRef<number>(0);

  const handleDoubleTap = (video: Video) => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      // double tap detected
      handleLike(video);
      setHeartVideoId(video.id);

      setTimeout(() => setHeartVideoId(null), 900);
    }

    lastTapRef.current = now;
  };

  const currentVideo = videos[currentVideoIndex];

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ================= HEADER TIKTOK ================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur">
        <div className="flex justify-between items-center px-4 py-3">
          <Search onClick={() => navigate("/search")} />

          <div className="flex gap-6 text-white font-semibold">
            <button
              onClick={() => setFeedMode("following")}
              className={feedMode === "following" ? "opacity-100" : "opacity-50"}
            >
              Following
            </button>

            <button
              onClick={() => setFeedMode("forYou")}
              className={feedMode === "forYou" ? "opacity-100" : "opacity-50"}
            >
              For You
            </button>
          </div>

          <Bell onClick={() => navigate("/notifications")} />
        </div>
      </header>

      {/* ================= FEED ================= */}
      <div
        ref={containerRef}
        className="pt-16 h-screen overflow-y-scroll"
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
              <div className="relative w-full h-full max-w-md mx-auto">
                <video
                  ref={(el) => (videoRefs.current[video.id] = el)}
                  data-video-id={video.id}
                  src={video.videoUrl}
                  className="w-full h-full object-cover"
                  loop
                  autoPlay={i === currentVideoIndex}
                  onClick={() => handleDoubleTap(video)}
                />

                {heartVideoId === video.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Heart className="text-white animate-ping" size={120} fill="white" />
                  </div>
                )}

                {/* ===== TikTok LEFT INFO ===== */}
                <div className="absolute bottom-24 left-4 text-white space-y-1 max-w-[70%]">
                  <p className="font-semibold">@user{video.userId}</p>
                  <p className="text-sm opacity-90 line-clamp-2">
                    {video.description || "Afritok video"}
                  </p>
                  <p className="text-xs opacity-70">🎵 Original sound</p>
                </div>

                {/* ===== TikTok RIGHT SIDEBAR ===== */}
                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 text-white">
                  {/* avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-600 border-2 border-white" />

                  {/* like */}
                  <button onClick={() => handleLike(video)} disabled={isLoadingLikes}>
                    <Heart size={28} fill={likedVideos.has(video.id as any) ? "red" : "none"} />
                    <p className="text-xs">{video.likes || 0}</p>
                  </button>

                  {/* comments */}
                  <button
                    onClick={() => {
                      setCurrentVideoIndex(i);
                      setShowComments(true);
                    }}
                  >
                    <MessageCircle size={28} />
                    <p className="text-xs">{video.comments || 0}</p>
                  </button>

                  {/* share */}
                  <button
                    onClick={() => {
                      setCurrentVideoIndex(i);
                      setShowShare(true);
                    }}
                  >
                    <Share2 size={28} />
                    <p className="text-xs">{video.shares || 0}</p>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= BOTTOM NAV ================= */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around py-3">
        <button onClick={() => navigate("/feed")}>Home</button>
        <button onClick={() => navigate("/search")}>Search</button>
        <button onClick={() => navigate("/upload")}>
          <PlusSquare size={32} />
        </button>
        <button onClick={() => navigate("/notifications")}>Inbox</button>
        <button onClick={() => navigate(`/profile/${user?.id}`)}>Profile</button>
      </nav>

      {currentVideo && (
        <CommentsModal
          videoId={currentVideo.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}

      {currentVideo && (
        <ShareModal
          videoTitle={currentVideo.title || ""}
          videoUrl={currentVideo.videoUrl}
          isOpen={showShare}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
