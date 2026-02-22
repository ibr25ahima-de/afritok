import { useEffect, useState, useRef, useCallback } from "react"; import { useAuth } from "@/_core/hooks/useAuth"; import { trpc } from "@/lib/trpc"; import { Button } from "@/components/ui/button"; import { useLocation } from "wouter"; import { Heart, MessageCircle, Share2, User, Loader2 } from "lucide-react"; import { APP_LOGO, APP_TITLE } from "@/const"; import CommentsModal from "@/components/CommentsModal"; import ShareModal from "@/components/ShareModal"; import { useRealtimeFeed } from "@/hooks/useRealtimeFeed"; import { useUserLikes } from "@/hooks/useUserLikes";

interface Video { id: number; userId: number; title: string | null; description: string | null; videoUrl: string; thumbnailUrl: string | null; duration: number | null; views: number | null; likes: number | null; comments: number | null; shares: number | null; createdAt: Date; }

export default function Feed() { const { user, isAuthenticated } = useAuth(); const [, navigate] = useLocation();

const [videos, setVideos] = useState<Video[]>([]); const [currentVideoIndex, setCurrentVideoIndex] = useState(0); const [offset, setOffset] = useState(0); const [showComments, setShowComments] = useState(false); const [showShare, setShowShare] = useState(false); const [touchStart, setTouchStart] = useState(0);

const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({}); const containerRef = useRef<HTMLDivElement>(null); const observerRef = useRef<IntersectionObserver | null>(null);

const feedQuery = trpc.video.feed.useQuery({ limit: 20, offset }); const likeToggleMutation = trpc.like.toggle.useMutation(); const incrementViewsMutation = trpc.video.incrementViews.useMutation();

const { likedVideos, toggleLike, isLoading: isLoadingLikes } = useUserLikes(user?.id, videos, isAuthenticated);

useRealtimeFeed(videos, setVideos);

/** ================= LOAD FEED ================= */ useEffect(() => { const incoming = feedQuery.data;

// 🔥 CRASH FIX → ensure array
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

/** ================= AUTOPLAY ================= */ useEffect(() => { const current = videos[currentVideoIndex]; if (!current) return;

Object.entries(videoRefs.current).forEach(([id, el]) => {
  if (el && parseInt(id) !== current.id) el.pause();
});

const el = videoRefs.current[current.id];
el?.play().catch(() => {});

}, [currentVideoIndex, videos]);

/** ================= VIEW COUNT ================= */ useEffect(() => { if (!containerRef.current) return;

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

/** ================= PAGINATION ================= */ useEffect(() => { if (currentVideoIndex >= videos.length - 3 && !feedQuery.isLoading) { setOffset((o) => o + 20); } }, [currentVideoIndex, videos.length]);

/** ================= AUTH REDIRECT ================= */ useEffect(() => { if (!isAuthenticated) navigate("/"); }, [isAuthenticated, navigate]);

/** ================= LIKE ================= */ const handleLike = async (video: Video) => { const wasLiked = likedVideos.has(video.id); toggleLike(video.id);

setVideos((prev) =>
  prev.map((v) =>
    v.id === video.id ? { ...v, likes: (v.likes || 0) + (wasLiked ? -1 : 1) } : v
  )
);

try {
  await likeToggleMutation.mutateAsync({ videoId: video.id });
} catch {
  toggleLike(video.id);
}

};

/** ================= SWIPE ================= */ const handleSwipe = useCallback( (start: number, end: number) => { const distance = start - end;

if (distance > 50 && currentVideoIndex < videos.length - 1)
    setCurrentVideoIndex((p) => p + 1);

  if (distance < -50 && currentVideoIndex > 0)
    setCurrentVideoIndex((p) => p - 1);
},
[currentVideoIndex, videos.length]

);

const currentVideo = videos[currentVideoIndex];

if (!isAuthenticated) return null;

return ( <div className="min-h-screen bg-black"> {/* HEADER */} <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur-md"> <div className="flex justify-between px-4 py-3"> <div className="flex items-center gap-2"> {APP_LOGO && <img src={APP_LOGO} className="h-8 w-8 rounded" />} <span className="text-white font-bold">{APP_TITLE}</span> </div> <Button variant="ghost" onClick={() => navigate(`/profile/${user?.id}`)}> <User className="text-white" /> </Button> </div> </header>

{/* FEED */}
  <div
    ref={containerRef}
    className="pt-16 h-screen overflow-y-scroll"
    style={{ scrollSnapType: "y mandatory" }}
    onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientY)}
    onTouchEnd={(e) => handleSwipe(touchStart, e.changedTouches[0].clientY)}
  >
    {videos.length === 0 ? (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" />
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
            />

            <div className="absolute right-4 bottom-32 flex flex-col gap-4 text-white">
              <button onClick={() => handleLike(video)} disabled={isLoadingLikes}>
                <Heart fill={likedVideos.has(video.id) ? "red" : "none"} />
                {video.likes || 0}
              </button>

              <button
                onClick={() => {
                  setCurrentVideoIndex(i);
                  setShowComments(true);
                }}
              >
                <MessageCircle />
                {video.comments || 0}
              </button>

              <button
                onClick={() => {
                  setCurrentVideoIndex(i);
                  setShowShare(true);
                }}
              >
                <Share2 />
                {video.shares || 0}
              </button>
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
</div>

); }
