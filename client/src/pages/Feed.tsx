import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2, User, Loader2, Search, PlusSquare, Bell, Bookmark, Download } from "lucide-react";
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
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [favoritedVideos, setFavoritedVideos] = useState<Set<number>>(new Set());
  const [videoCounters, setVideoCounters] = useState<Record<number, { likes: number; comments: number; shares: number; favorites: number }>>({});
  
  // NEW: Video preloading, loading, retry, data saver, progress, long press
  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});
  const [loadingVideos, setLoadingVideos] = useState<Set<number>>(new Set());
  const [videoRetries, setVideoRetries] = useState<Record<number, number>>({});
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [longPressMenu, setLongPressMenu] = useState<{ videoId: number; x: number; y: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState<Set<number>>(new Set());

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

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

  /** ================= AUTOPLAY WITH SMART MUTE ================= */
  useEffect(() => {
    const current = videos[currentVideoIndex];
    if (!current) return;

    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (el && parseInt(id) !== current.id) {
        el.pause();
        el.muted = true; // Mute all non-active videos
      }
    });

    const el = videoRefs.current[current.id];
    if (el) {
      el.muted = muted; // Only unmute if user enabled sound
      el.play().catch(() => {});
    }
  }, [currentVideoIndex, videos, muted]);

  /** ================= VIDEO PRELOADING ================= */
  useEffect(() => {
    const current = videos[currentVideoIndex];
    if (!current) return;

    // Preload next 1-2 videos
    const nextIndices = [currentVideoIndex + 1, currentVideoIndex + 2];
    nextIndices.forEach((idx) => {
      if (idx < videos.length) {
        const nextVideo = videos[idx];
        const videoEl = videoRefs.current[nextVideo.id];
        if (videoEl && videoEl.readyState < 2) {
          videoEl.load();
        }
      }
    });
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

  /** ================= DOUBLE TAP WITH ANIMATED HEART ================= */
  const handleVideoTap = (video: Video, e: React.MouseEvent) => {
    const now = Date.now();

    // double tap = like
    if (now - lastTapRef.current < 300) {
      handleLike(video);
      setHeartVideoId(video.id);
      
      // Animate heart floating up
      const heart = document.createElement('div');
      heart.innerHTML = '❤️';
      heart.style.position = 'fixed';
      heart.style.left = e.clientX + 'px';
      heart.style.top = e.clientY + 'px';
      heart.style.fontSize = '48px';
      heart.style.pointerEvents = 'none';
      heart.style.zIndex = '1000';
      heart.style.animation = 'float-up 1s ease-out forwards';
      document.body.appendChild(heart);
      
      setTimeout(() => {
        heart.remove();
        setHeartVideoId(null);
      }, 1000);
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

  /** ================= LONG PRESS GESTURE ================= */
  const handleTouchStart = (e: React.TouchEvent, video: Video) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };

    longPressTimerRef.current = setTimeout(() => {
      setLongPressMenu({
        videoId: video.id,
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  /** ================= DOWNLOAD VIDEO ================= */
  const handleDownload = async (video: Video) => {
    try {
      const link = document.createElement('a');
      link.href = video.videoUrl;
      link.download = `afritok-${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setLongPressMenu(null);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  /** ================= WHATSAPP SHARE ================= */
  const handleWhatsAppShare = (video: Video) => {
    const text = `Check out this video on Afritok: ${video.description || 'Amazing video!'}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setLongPressMenu(null);
  };

  /** ================= VIDEO PROGRESS TRACKING ================= */
  const handleTimeUpdate = (video: Video, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    if (el.duration) {
      const progress = (el.currentTime / el.duration) * 100;
      setVideoProgress((prev) => ({
        ...prev,
        [video.id]: progress,
      }));
    }
  };

  /** ================= VIDEO ERROR RETRY ================= */
  const handleVideoError = (video: Video) => {
    const retries = videoRetries[video.id] || 0;
    if (retries < 3) {
      setVideoRetries((prev) => ({
        ...prev,
        [video.id]: retries + 1,
      }));
      
      const el = videoRefs.current[video.id];
      if (el) {
        setTimeout(() => {
          el.load();
        }, 1000 * (retries + 1)); // Exponential backoff
      }
    }
  };

  /** ================= SWIPE WITH IMPROVED GESTURE ================= */
  const handleSwipe = useCallback(
    (start: number, end: number) => {
      const distance = start - end;
      const minSwipeDistance = 50;
      
      // Prevent accidental swipes
      if (Math.abs(distance) < minSwipeDistance) return;
      
      if (distance > minSwipeDistance && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex((p) => p + 1);
      }
      if (distance < -minSwipeDistance && currentVideoIndex > 0) {
        setCurrentVideoIndex((p) => p - 1);
      }
    },
    [currentVideoIndex, videos.length]
  );

  const currentVideo = videos[currentVideoIndex];
  const currentCounters = currentVideo ? videoCounters[currentVideo.id] : null;

  if (!isAuthenticated) return null;

  // Add CSS animation for floating hearts
  if (typeof document !== 'undefined' && !document.getElementById('float-up-animation')) {
    const style = document.createElement('style');
    style.id = 'float-up-animation';
    style.innerHTML = `
      @keyframes float-up {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateY(-100px) scale(0.5);
        }
      }
    `;
    document.head.appendChild(style);
  }

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

          <div className="flex gap-2">
            <button
              onClick={() => setDataSaverMode(!dataSaverMode)}
              className={`text-xs px-2 py-1 rounded ${dataSaverMode ? 'bg-green-600' : 'bg-gray-700'}`}
              title="Data Saver Mode"
            >
              💾
            </button>
            <Bell onClick={() => navigate("/notifications")} className="cursor-pointer" />
          </div>
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
                {/* VIDEO LOADING INDICATOR */}
                {loadingVideos.has(video.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-40">
                    <Loader2 className="animate-spin text-white" size={48} />
                  </div>
                )}

                {/* VIDEO ELEMENT */}
                <video
                  ref={(el) => (videoRefs.current[video.id] = el)}
                  data-video-id={video.id}
                  src={dataSaverMode ? video.videoUrl + '?quality=low' : video.videoUrl}
                  className="w-full h-full object-cover"
                  loop
                  autoPlay={i === currentVideoIndex}
                  onClick={(e) => handleVideoTap(video, e)}
                  onTouchStart={(e) => handleTouchStart(e as any, video)}
                  onTouchEnd={handleTouchEnd}
                  onTimeUpdate={(e) => handleTimeUpdate(video, e)}
                  onLoadStart={() => setLoadingVideos((prev) => new Set([...prev, video.id]))}
                  onCanPlay={() => setLoadingVideos((prev) => {
                    const next = new Set(prev);
                    next.delete(video.id);
                    return next;
                  })}
                  onError={() => handleVideoError(video)}
                  muted={muted}
                />

                {/* VOLUME TOGGLE */}
                <button
                  onClick={() => setMuted(!muted)}
                  className="absolute top-20 right-4 bg-black/60 p-2 rounded-full hover:bg-black/80 transition"
                >
                  {muted ? "🔇" : "🔊"}
                </button>

                {/* VIDEO PROGRESS BAR */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${videoProgress[video.id] || 0}%` }}
                  />
                </div>

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
                  {/* User Avatar with Follow Button */}
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 border-2 border-white flex items-center justify-center cursor-pointer hover:scale-110 transition">
                      <User size={24} />
                    </div>
                    <button
                      onClick={() => {
                        if (isFollowing.has(video.userId)) {
                          setIsFollowing((prev) => {
                            const next = new Set(prev);
                            next.delete(video.userId);
                            return next;
                          });
                        } else {
                          setIsFollowing((prev) => new Set([...prev, video.userId]));
                        }
                      }}
                      className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap"
                    >
                      {isFollowing.has(video.userId) ? "Following" : "+ Follow"}
                    </button>
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

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(video)}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition"
                  >
                    <Download size={32} className="cursor-pointer" />
                    <p className="text-xs font-semibold">Save</p>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* LONG PRESS MENU */}
      {longPressMenu && (
        <div
          className="fixed bg-black/90 rounded-lg p-3 z-50 flex flex-col gap-2"
          style={{
            left: `${longPressMenu.x - 80}px`,
            top: `${longPressMenu.y - 100}px`,
          }}
        >
          <button
            onClick={() => handleDownload(videos[currentVideoIndex])}
            className="text-white text-sm hover:bg-gray-700 px-3 py-2 rounded flex items-center gap-2"
          >
            <Download size={16} /> Download
          </button>
          <button
            onClick={() => {
              setCurrentVideoIndex(videos.findIndex((v) => v.id === longPressMenu.videoId));
              setShowShare(true);
              setLongPressMenu(null);
            }}
            className="text-white text-sm hover:bg-gray-700 px-3 py-2 rounded flex items-center gap-2"
          >
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={() => handleWhatsAppShare(videos[currentVideoIndex])}
            className="text-white text-sm hover:bg-gray-700 px-3 py-2 rounded flex items-center gap-2"
          >
            💬 WhatsApp
          </button>
          <button
            onClick={() => setLongPressMenu(null)}
            className="text-gray-400 text-sm hover:bg-gray-700 px-3 py-2 rounded"
          >
            Close
          </button>
        </div>
      )}

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
