import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Heart,
  MessageCircle,
  User,
  Loader2,
  Search,
  Bell,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";

/** ================= TYPES ================= */
interface Video {
  id: number;
  userId: number;
  title?: string | null;
  description: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  favorites: number | null;
  createdAt: Date;
  user?: {
    id: number;
    name: string;
    avatarUrl?: string;
  };
}

export default function Feed() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [favoritedVideos, setFavoritedVideos] = useState<Set<number>>(new Set());
  const [videoCounters, setVideoCounters] = useState<Record<number, any>>({});
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef(0);

  /** ================= API ================= */
  const feedQuery = trpc.video.feed.useQuery({ limit: 20, offset });
  const likeToggleMutation = trpc.like.toggle.useMutation();
  const favoriteToggleMutation = trpc.favorite.toggle.useMutation();
  const incrementViewsMutation = trpc.video.incrementViews.useMutation();

  /** ================= LOAD VIDEOS ================= */
  useEffect(() => {
    if (!feedQuery.data || feedQuery.data.length === 0) return;

    setVideos((prev) => {
      const newVideos = feedQuery.data.filter(
        (v: Video) => !prev.find((pv) => pv.id === v.id)
      );
      return [...prev, ...newVideos];
    });

    feedQuery.data.forEach((v: Video) => {
      setVideoCounters((prev) => ({
        ...prev,
        [v.id]: {
          likes: v.likes || 0,
          comments: v.comments || 0,
          shares: v.shares || 0,
          favorites: v.favorites || 0,
        },
      }));
    });
  }, [feedQuery.data]);

  /** ================= LIKE ================= */
  const handleLike = async (video: Video) => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const wasLiked = likedVideos.has(video.id);
    const newLiked = new Set(likedVideos);

    if (wasLiked) newLiked.delete(video.id);
    else newLiked.add(video.id);

    setLikedVideos(newLiked);

    setVideoCounters((prev) => ({
      ...prev,
      [video.id]: {
        ...prev[video.id],
        likes: (prev[video.id]?.likes || 0) + (wasLiked ? -1 : 1),
      },
    }));

    try {
      const res = await likeToggleMutation.mutateAsync({
        videoId: video.id,
      });

      if (res?.earning?.success) {
        // Earning recorded
      }
    } catch {
      setLikedVideos(likedVideos);
      setVideoCounters((prev) => ({
        ...prev,
        [video.id]: {
          ...prev[video.id],
          likes: (prev[video.id]?.likes || 0) + (wasLiked ? 1 : -1),
        },
      }));
    }
  };

  /** ================= FAVORITE ================= */
  const handleFavorite = async (video: Video) => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const was = favoritedVideos.has(video.id);
    const next = new Set(favoritedVideos);

    if (was) next.delete(video.id);
    else next.add(video.id);

    setFavoritedVideos(next);

    try {
      await favoriteToggleMutation.mutateAsync({ videoId: video.id });
    } catch {
      const prev = new Set(favoritedVideos);
      if (was) prev.add(video.id);
      else prev.delete(video.id);
      setFavoritedVideos(prev);
    }
  };

  /** ================= AUTOPLAY ================= */
  useEffect(() => {
    const current = videos[currentVideoIndex];
    if (!current) return;

    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (el && parseInt(id) !== current.id) {
        el.pause();
      }
    });

    const el = videoRefs.current[current.id];
    if (el) {
      el.play().catch(() => {});
    }
  }, [currentVideoIndex, videos]);

  /** ================= VIEW TRACKING ================= */
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = Number((entry.target as HTMLElement).dataset.videoId);
          if (id) {
            incrementViewsMutation.mutate({ videoId: id });
          }
        });
      },
      { threshold: 0.5 }
    );

    containerRef.current.querySelectorAll("video").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [videos]);

  /** ================= INFINITE SCROLL ================= */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPercentage =
        (container.scrollTop + container.clientHeight) / container.scrollHeight;

      if (scrollPercentage > 0.8 && !isLoading && feedQuery.hasNextPage) {
        setIsLoading(true);
        setOffset((prev) => prev + 20);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isLoading, feedQuery.hasNextPage]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Veuillez vous connecter</p>
      </div>
    );
  }

  const current = videos[currentVideoIndex];
  const counters = current ? videoCounters[current.id] : null;

  return (
    <div className="bg-black text-white h-screen overflow-hidden">
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Afritok</h1>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-900 rounded-full transition">
            <Search size={20} />
          </button>
          <button className="p-2 hover:bg-gray-900 rounded-full transition">
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* FEED CONTAINER */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        {videos.length === 0 ? (
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : (
          videos.map((video, i) => (
            <div
              key={video.id}
              className="h-screen relative snap-start flex-shrink-0"
            >
              {/* VIDEO */}
              <video
                ref={(el) => (videoRefs.current[video.id] = el)}
                data-video-id={video.id}
                src={video.videoUrl}
                className="w-full h-full object-cover"
                loop
                muted={muted}
                autoPlay={i === currentVideoIndex}
                onClick={() => setCurrentVideoIndex(i)}
              />

              {/* GRADIENT OVERLAY */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />

              {/* MUTE BUTTON */}
              <button
                onClick={() => setMuted(!muted)}
                className="absolute top-20 right-4 z-30 p-2 bg-black/50 hover:bg-black/70 rounded-full transition"
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {/* RIGHT SIDEBAR - ACTIONS */}
              <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-20">
                {/* LIKE */}
                <button
                  onClick={() => handleLike(video)}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition"
                >
                  <div className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition">
                    <Heart
                      size={24}
                      fill={likedVideos.has(video.id) ? "currentColor" : "none"}
                      color={likedVideos.has(video.id) ? "#ef4444" : "white"}
                    />
                  </div>
                  <p className="text-xs font-semibold">{counters?.likes || 0}</p>
                </button>

                {/* COMMENTS */}
                <button
                  onClick={() => {
                    setSelectedVideoId(video.id);
                    setShowComments(true);
                  }}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition"
                >
                  <div className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition">
                    <MessageCircle size={24} />
                  </div>
                  <p className="text-xs font-semibold">{counters?.comments || 0}</p>
                </button>

                {/* SHARE */}
                <button
                  onClick={() => {
                    setSelectedVideoId(video.id);
                    setShowShare(true);
                  }}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition"
                >
                  <div className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition">
                    <Share2 size={24} />
                  </div>
                  <p className="text-xs font-semibold">{counters?.shares || 0}</p>
                </button>

                {/* FAVORITE */}
                <button
                  onClick={() => handleFavorite(video)}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition"
                >
                  <div className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition">
                    <Bookmark
                      size={24}
                      fill={favoritedVideos.has(video.id) ? "currentColor" : "none"}
                      color={favoritedVideos.has(video.id) ? "#fbbf24" : "white"}
                    />
                  </div>
                </button>

                {/* PROFILE */}
                <button
                  onClick={() => navigate(`/profile/${video.userId}`)}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition mt-2"
                >
                  <div className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition">
                    {video.user?.avatarUrl ? (
                      <img
                        src={video.user.avatarUrl}
                        alt={video.user.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                </button>
              </div>

              {/* BOTTOM INFO */}
              <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-start gap-3">
                  {video.user?.avatarUrl ? (
                    <img
                      src={video.user.avatarUrl}
                      alt={video.user.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                      <User size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-white">
                      {video.user?.name || "Utilisateur"}
                    </p>
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {video.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="animate-spin" size={40} />
          </div>
        )}
      </div>

      {/* MODALS */}
      {showComments && selectedVideoId && (
        <CommentsModal
          videoId={selectedVideoId}
          onClose={() => setShowComments(false)}
        />
      )}

      {showShare && selectedVideoId && (
        <ShareModal
          videoId={selectedVideoId}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
