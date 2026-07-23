import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  User,
  Loader2,
} from "lucide-react";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";
import {
  FlowerIcon,
  BirdIcon,
  GemIcon,
  ButterflyIcon,
  LionAvatar,
  BaobabIcon,
  ElephantIcon,
  SunIcon,
  HummingbirdIcon,
  LeopardIcon,
  FollowPlusIcon,
  MuteIcon,
  UnmuteIcon,
  SearchIcon,
  BellIcon,
} from "@/components/Icons";

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
  const [initialPlayDone, setInitialPlayDone] = useState(false);
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

  /** ================= INITIAL VIDEO PREPARATION ================= */
  useEffect(() => {
    if (videos.length > 0 && loadingVideoId === null) {
      setLoadingVideoId(videos[0].id);
    }
  }, [videos]);

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
        player.play().catch((err) => {
          console.log("Autoplay blocked or failed", err);
        });
        if (index === 0 && !initialPlayDone) {
          setInitialPlayDone(true);
        }
      } else {
        player.pause();
        player.currentTime = 0;
      }
    });

    // Précharger la vidéo suivante
    const nextVideo = videos[currentVideoIndex + 1];
    if (nextVideo) {
      const nextPlayer = videoRefs.current[nextVideo.id];
      if (nextPlayer) {
        nextPlayer.preload = "auto";
      }
    }
  }, [currentVideoIndex, videos, initialPlayDone]);

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

      if (scrollPercentage > 0.6 && !isLoading) {
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
      {/* HEADER — Style Afritok avec icônes dorées */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-amber-400">Afritok</h1>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-amber-900/30 rounded-full transition">
            <SearchIcon size={20} />
          </button>
          <button className="p-2 hover:bg-amber-900/30 rounded-full transition">
            <BellIcon size={20} />
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
            <Loader2 className="animate-spin text-amber-400" size={40} />
          </div>
        ) : (
          videos.map((video, i) => (
            <div
              key={video.id}
              data-index={i}
              className="video-item h-screen relative snap-start flex-shrink-0"
            >
              {/* THUMBNAIL - affichée tant que la vidéo ne joue pas */}
              {loadingVideoId === video.id && video.thumbnailUrl && (
                <img
                  src={video.thumbnailUrl}
                  alt="miniature"
                  className="absolute inset-0 w-full h-full object-cover z-10"
                />
              )}

              {/* LOADING INDICATOR */}
              {loadingVideoId === video.id && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <Loader2 className="animate-spin text-amber-400" size={40} />
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

              {/* MUTE BUTTON — Nouveau style doré */}
              <button
                onClick={() => setMuted(!muted)}
                className="absolute top-20 right-4 z-30 p-1.5 bg-black/40 hover:bg-black/60 rounded-full transition"
              >
                {muted ? <MuteIcon size={22} /> : <UnmuteIcon size={22} />}
              </button>

              {/* RIGHT SIDEBAR - ACTIONS — Nouvelles icônes colorées */}
              <div className="absolute right-3 top-32 flex flex-col gap-5 z-30">
                {/* AVATAR — Octogone + bouton Suivre */}
                <button
                  onClick={() => navigate(`/profile/${video.userId}`)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="relative">
                    <div className="w-14 h-14 overflow-hidden bg-amber-900/30 border-2 border-amber-500/60" style={{ clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" }}>
                      {video.user?.avatarUrl ? (
                        <img
                          src={video.user.avatarUrl}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-700 to-amber-900">
                          <LionAvatar size={32} />
                        </div>
                      )}
                    </div>
                    {/* Bouton Suivre (+) — NOUVEAU */}
                    <div className="absolute -bottom-1 -right-1">
                      <FollowPlusIcon size={16} />
                    </div>
                  </div>
                </button>

                {/* LIKE — Fleur colorée */}
                <button
                  onClick={() => handleLike(video)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="p-1 hover:scale-110 transition-transform">
                    <FlowerIcon active={likedVideos.has(video.id)} size={32} />
                  </div>
                  <span className="text-xs font-semibold text-white/90">{videoCounters[video.id]?.likes || 0}</span>
                </button>

                {/* COMMENTAIRE — Oiseau coloré */}
                <button
                  onClick={() => {
                    setSelectedVideoId(video.id);
                    setShowComments(true);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-1 hover:scale-110 transition-transform">
                    <BirdIcon active={false} size={30} />
                  </div>
                  <span className="text-xs font-semibold text-white/90">{videoCounters[video.id]?.comments || 0}</span>
                </button>

                {/* FAVORI — Pépite d'or */}
                <button
                  onClick={() => handleFavorite(video)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-1 hover:scale-110 transition-transform">
                    <GemIcon active={favoritedVideos.has(video.id)} size={30} />
                  </div>
                  <span className="text-xs font-semibold text-white/90">{videoCounters[video.id]?.favorites || 0}</span>
                </button>

                {/* PARTAGE — Papillon */}
                <button
                  onClick={() => {
                    setSelectedVideoId(video.id);
                    setShowShare(true);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-1 hover:scale-110 transition-transform">
                    <ButterflyIcon active={false} size={30} />
                  </div>
                  <span className="text-xs font-semibold text-white/90">{videoCounters[video.id]?.shares || 0}</span>
                </button>
              </div>

              {/* BOTTOM INFO */}
              <div className="absolute bottom-24 left-4 right-16 z-30">
                <h3 className="font-bold text-lg mb-1 text-amber-100">@{video.user?.name || "Utilisateur"}</h3>
                <p className="text-sm line-clamp-2 mb-2 text-white/90">{video.description}</p>
                <div className="flex items-center gap-2">
                  <div className="bg-amber-900/40 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-700/30">
                    Musique Originale
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* NAVIGATION BAR — Nouveau style Afritok */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-amber-900/40 px-2 py-2 flex items-center justify-between z-50">
        <button
          onClick={() => navigate("/feed")}
          className="flex flex-col items-center gap-0.5 hover:scale-105 transition-transform"
        >
          <BaobabIcon active={true} size={26} />
          <span className="text-[9px] text-amber-200 font-medium">Accueil</span>
        </button>

        <button
          onClick={() => navigate("/discover")}
          className="flex flex-col items-center gap-0.5 hover:scale-105 transition-transform"
        >
          <ElephantIcon active={false} size={26} />
          <span className="text-[9px] text-white/60 font-medium">Amis</span>
        </button>

        <button
          onClick={() => navigate("/upload")}
          className="flex flex-col items-center -mt-8"
        >
          <div className="relative hover:scale-110 transition-transform duration-200">
            {/* Soleil doré au lieu du + bleu/rose */}
            <div className="absolute -left-2 top-0 w-14 h-12 bg-amber-600 rounded-full blur-sm opacity-60"></div>
            <div className="relative w-14 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-amber-400">
              <SunIcon active={true} size={30} />
            </div>
          </div>
          <span className="text-[9px] text-amber-300 font-medium mt-0.5">Créer</span>
        </button>

        <button
          onClick={() => navigate("/inbox")}
          className="flex flex-col items-center gap-0.5 hover:scale-105 transition-transform"
        >
          <HummingbirdIcon active={false} hasNotification={false} size={26} />
          <span className="text-[9px] text-white/60 font-medium">Messages</span>
        </button>

        <button
          onClick={() => navigate(`/profile/${user?.id}`)}
          className="flex flex-col items-center gap-0.5 hover:scale-105 transition-transform"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="profile"
              className="w-7 h-7 rounded-full object-cover border-2 border-amber-500/60"
            />
          ) : (
            <LeopardIcon active={false} size={26} />
          )}
          <span className="text-[9px] text-white/60 font-medium">Profil</span>
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
