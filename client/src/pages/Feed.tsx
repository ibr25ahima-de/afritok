import { useEffect, useState, useRef } from "react";
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
  Plus,
  Home,
  Mail,
  Users,
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
  const [, navigate] = useLocation();

  // ✅ NOUVEAU SYSTÈME DE FEED (trpc.feed.getFeed)
  const [offset, setOffset] = useState(0);
  const { data: trpcVideos, isLoading: trpcLoading } = trpc.feed.getFeed.useQuery({
    limit: 20,
    offset: offset,
  });

  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [favoritedVideos, setFavoritedVideos] = useState<Set<number>>(new Set());
  const [videoCounters, setVideoCounters] = useState<Record<number, any>>({});
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingVideoId, setLoadingVideoId] = useState<number | null>(null);

  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  /** ================= API ================= */
  const likeToggleMutation = trpc.like.toggle.useMutation();
  const favoriteToggleMutation = trpc.favorite.toggle.useMutation();
  const incrementViewsMutation = trpc.video.incrementViews.useMutation();

  /** ================= LOAD VIDEOS ================= */
  useEffect(() => {
    if (!trpcVideos || trpcVideos.length === 0) return;

    setVideos(prev => {
      const newVideos = [...prev];
      trpcVideos.forEach(v => {
        if (!newVideos.find(nv => nv.id === v.id)) {
          newVideos.push(v);
        }
      });
      return newVideos;
    });

    setVideoCounters(prev => {
      const updated = { ...prev };
      trpcVideos.forEach(v => {
        if (!updated[v.id]) {
          updated[v.id] = {
            likes: v.likes || 0,
            comments: v.comments || 0,
            shares: v.shares || 0,
            favorites: v.favorites || 0,
          };
        }
      });
      return updated;
    });
    setIsLoading(false);
  }, [trpcVideos]);

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
      await likeToggleMutation.mutateAsync({
        videoId: video.id,
      });
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

    setVideoCounters((prev) => ({
      ...prev,
      [video.id]: {
        ...prev[video.id],
        favorites: (prev[video.id]?.favorites || 0) + (was ? -1 : 1),
      },
    }));

    try {
      await favoriteToggleMutation.mutateAsync({ videoId: video.id });
    } catch {
      const prev = new Set(favoritedVideos);
      if (was) prev.add(video.id);
      else prev.delete(video.id);
      setFavoritedVideos(prev);
      setVideoCounters((prevCounters) => ({
        ...prevCounters,
        [video.id]: {
          ...prevCounters[video.id],
          favorites: (prevCounters[video.id]?.favorites || 0) + (was ? 1 : -1),
        },
      }));
    }
  };

  /** ================= INTERSECTION OBSERVER ================= */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setCurrentVideoIndex(index);
          }
        });
      },
      {
        threshold: 0.7,
      }
    );

    const elements = containerRef.current?.querySelectorAll(".video-item");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos]);

  /** ================= AUTOPLAY & PRELOAD ================= */
  useEffect(() => {
    videos.forEach((video, index) => {
      const player = videoRefs.current[video.id];
      if (!player) return;

      if (index === currentVideoIndex) {
        player.play().catch(() => {});
      } else {
        player.pause();
        player.currentTime = 0;
      }
    });
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

      if (scrollPercentage > 0.8 && !isLoading) {
        setIsLoading(true);
        setOffset((prev) => prev + 20);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  if (trpcLoading && videos.length === 0) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Veuillez vous connecter</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white h-screen overflow-hidden flex flex-col">
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
        className="flex-1 overflow-y-auto snap-y snap-mandatory overscroll-none pb-20"
      >
        {videos.length === 0 ? (
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : (
          videos.map((video, i) => (
            <div
              key={video.id}
              data-index={i}
              className="video-item h-screen relative snap-start flex-shrink-0"
            >
              {/* LOADING INDICATOR */}
              {loadingVideoId === video.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <Loader2 className="animate-spin text-white" size={40} />
                </div>
              )}

              {/* VIDEO */}
              {video.videoUrl ? (
                <video
                  ref={(el) => (videoRefs.current[video.id] = el)}
                  data-video-id={video.id}
                  src={video.videoUrl}
                  className="w-full h-full object-cover bg-black"
                  loop
                  playsInline
                  preload="auto"
                  muted={muted}
                  autoPlay={i === currentVideoIndex}
                  controls={false}
                  disablePictureInPicture
                  controlsList="nodownload noplaybackrate"
                  onWaiting={() => setLoadingVideoId(video.id)}
                  onPlaying={() => setLoadingVideoId(null)}
                  onCanPlay={() => setLoadingVideoId(null)}
                  onLoadedData={(e) => {
                    if (i === currentVideoIndex) {
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  onError={(e) => {
                    console.log("Erreur vidéo", e);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                  <p className="text-gray-400">Vidéo indisponible</p>
                </div>
              )}

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
              <div className="absolute right-3 top-32 flex flex-col gap-4 z-30">
                <button
                  onClick={() => navigate(`/profile/${video.userId}`)}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-black">
                    {video.user?.avatarUrl ? (
                      <img
                        src={video.user.avatarUrl}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500">
                        <User size={24} />
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleLike(video)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`p-2 rounded-full transition ${likedVideos.has(video.id) ? 'text-red-500 bg-red-500/20' : 'text-white bg-black/40'}`}>
                    <Heart size={28} fill={likedVideos.has(video.id) ? "currentColor" : "none"} />
                  </div>
                  <span className="text-xs font-semibold">{videoCounters[video.id]?.likes || 0}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedVideoId(video.id);
                    setShowComments(true);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-2 bg-black/40 rounded-full">
                    <MessageCircle size={28} />
                  </div>
                  <span className="text-xs font-semibold">{videoCounters[video.id]?.comments || 0}</span>
                </button>

                <button
                  onClick={() => handleFavorite(video)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`p-2 rounded-full transition ${favoritedVideos.has(video.id) ? 'text-yellow-500 bg-yellow-500/20' : 'text-white bg-black/40'}`}>
                    <Bookmark size={28} fill={favoritedVideos.has(video.id) ? "currentColor" : "none"} />
                  </div>
                  <span className="text-xs font-semibold">{videoCounters[video.id]?.favorites || 0}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedVideoId(video.id);
                    setShowShare(true);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-2 bg-black/40 rounded-full">
                    <Share2 size={28} />
                  </div>
                  <span className="text-xs font-semibold">{videoCounters[video.id]?.shares || 0}</span>
                </button>
              </div>

              {/* BOTTOM INFO */}
              <div className="absolute bottom-24 left-4 right-16 z-30">
                <h3 className="font-bold text-lg mb-1">@{video.user?.name || "Utilisateur"}</h3>
                <p className="text-sm line-clamp-2 mb-2">{video.description}</p>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                    Musique Originale
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 px-6 py-3 flex items-center justify-between z-50">
        <button
          onClick={() => navigate("/feed")}
          className="flex flex-col items-center gap-1 text-white"
        >
          <Home size={24} />
          <span className="text-[10px]">Accueil</span>
        </button>

        <button
          onClick={() => navigate("/discover")}
          className="flex flex-col items-center gap-1 text-gray-500"
        >
          <Users size={24} />
          <span className="text-[10px]">Amis</span>
        </button>

        <button
          onClick={() => navigate("/upload")}
          className="flex flex-col items-center -mt-10"
        >
          <div className="relative hover:scale-110 transition-transform duration-200">
            <div className="absolute -left-1 top-0 w-12 h-10 bg-cyan-400 rounded-xl"></div>
            <div className="absolute left-1 top-0 w-12 h-10 bg-pink-500 rounded-xl"></div>
            <div className="relative w-12 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Plus size={28} className="text-black font-bold" />
            </div>
          </div>
          <span className="text-[10px] text-white mt-1">Créer</span>
        </button>

        <button
          onClick={() => navigate("/inbox")}
          className="flex flex-col items-center gap-1 text-gray-500"
        >
          <Mail size={24} />
          <span className="text-[10px]">Messages</span>
        </button>

        <button
          onClick={() => navigate(`/profile/${user?.id}`)}
          className="flex flex-col items-center gap-1 text-gray-500"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="profile"
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <User size={24} />
          )}
          <span className="text-[10px]">Profil</span>
        </button>
      </nav>

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
