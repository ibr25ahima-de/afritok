import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Heart,
  MessageCircle,
  Share2,
  User,
  Loader2,
  Music2,
  Plus,
} from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";
import { useRealtimeFeed } from "@/hooks/useRealtimeFeed";
import { useUserLikes } from "@/hooks/useUserLikes";
import BottomNav from "@/components/BottomNav";

/** ================= TYPES ================= */
interface Video {
  id: number;
  userId: number;
  username?: string;
  avatarUrl?: string;
  title: string | null;
  description: string | null;
  music?: string | null;
  videoUrl: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

/** ================= COMPONENT ================= */
export default function Feed() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /** ================= QUERIES ================= */
  const feedQuery = trpc.video.feed.useQuery({ limit: 20, offset });
  const likeToggleMutation = trpc.like.toggle.useMutation();
  const incrementViewsMutation = trpc.video.incrementViews.useMutation();

  const { likedVideos, toggleLike, isLoading: isLoadingLikes } =
    useUserLikes(videos, isAuthenticated);

  /** ================= REALTIME ================= */
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
    const wasLiked = likedVideos.has(video.id);
    toggleLike(video.id);

    setVideos((prev) =>
      prev.map((v) =>
        v.id === video.id
          ? { ...v, likes: (v.likes || 0) + (wasLiked ? -1 : 1) }
          : v
      )
    );

    try {
      await likeToggleMutation.mutateAsync({ videoId: video.id });
    } catch {
      toggleLike(video.id);
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

  const currentVideo = videos[currentVideoIndex];

  if (!isAuthenticated) return null;

  /** ================= UI ================= */
  return (
    <div className="min-h-screen bg-black">
      {/* TOP TABS */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center gap-6 py-3 text-white font-semibold">
        <span className="opacity-60">Following</span>
        <span className="border-b-2">For You</span>
      </header>

      {/* FEED */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
        onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientY)}
        onTouchEnd={(e) => handleSwipe(touchStart, e.changedTouches[0].clientY)}
      >
        {videos.length === 0 ? (
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-white" />
          </div>
        ) : (
          videos.map((video, i) => (
            <div key={video.id} className="h-screen" style={{ scrollSnapAlign: "start" }}>
              <div className="relative w-full h-full">

                {/* VIDEO */}
                <video
                  ref={(el) => (videoRefs.current[video.id] = el)}
                  data-video-id={video.id}
                  src={video.videoUrl}
                  className="w-full h-full object-cover"
                  loop
                  autoPlay={i === currentVideoIndex}
                />

                {/* RIGHT ACTIONS */}
                <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 text-white">

                  {/* avatar */}
                  <div
                    onClick={() => navigate(`/profile/${video.userId}`)}
                    className="relative"
                  >
                    <img
                      src={video.avatarUrl || "/avatar.png"}
                      className="w-12 h-12 rounded-full border-2 border-white"
                    />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 rounded-full p-1">
                      <Plus size={12} />
                    </div>
                  </div>

                  {/* like */}
                  <button onClick={() => handleLike(video)}>
                    <Heart fill={likedVideos.has(video.id) ? "red" : "none"} />
                    <div>{video.likes || 0}</div>
                  </button>

                  {/* comment */}
                  <button
                    onClick={() => {
                      setCurrentVideoIndex(i);
                      setShowComments(true);
                    }}
                  >
                    <MessageCircle />
                    <div>{video.comments || 0}</div>
                  </button>

                  {/* share */}
                  <button
                    onClick={() => {
                      setCurrentVideoIndex(i);
                      setShowShare(true);
                    }}
                  >
                    <Share2 />
                    <div>{video.shares || 0}</div>
                  </button>

                  {/* music disk */}
                  <div className="animate-spin">
                    <Music2 />
                  </div>
                </div>

                {/* BOTTOM INFO */}
                <div className="absolute bottom-6 left-3 right-24 text-white">
                  <div className="font-semibold">@{video.username || "user"}</div>
                  <div className="text-sm">{video.description}</div>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <Music2 size={14} />
                    {video.music || "Original sound"}
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

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
      <BottomNav />
    </div>
  );
}
