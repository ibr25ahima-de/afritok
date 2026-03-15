import { useAuth } from "@/_core/hooks/useAuth";
import { MonetizationProgressBar } from "@/components/MonetizationProgressBar";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, MapPin, Edit3, UserPlus, UserCheck, MoreVertical, Flame, Lock, Share, Flag, Eye } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Earning {
  id: number;
  userId: number;
  amount: string;
  source: string;
  videoId: number | null;
  createdAt: string;
}

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

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/profile/:userId");
  const userId = params?.userId ? parseInt(params.userId) : currentUser?.id;
  const isOwnProfile = currentUser?.id === userId;

  // ================= STATE =================
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "likes" | "favorites">("videos");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMonetization, setShowMonetization] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  if (!match) return null;

  // ================= API QUERIES =================
  const userQuery = trpc.user.getProfile.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const videosQuery = trpc.video.getUserVideos.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const followerCountQuery = trpc.follower.getCount.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const earningsQuery = trpc.earnings.getMyEarnings.useQuery(
    undefined,
    { enabled: isOwnProfile }
  );

  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Profil non trouvé</p>
      </div>
    );
  }

  if (userQuery.isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Chargement du profil...</p>
      </div>
    );
  }

  const profile = userQuery.data;
  const videos = (videosQuery.data || []) as Video[];
  const followerCount = followerCountQuery.data;

  // Calculate total likes from all videos
  const totalLikes = videos.reduce((sum, video) => sum + (video.likes || 0), 0);

  // Filter videos based on active tab
  const filteredVideos = videos;

  // Calculate earnings by source (simplified)
  const earningsBySource: Record<string, { total: number; count: number }> = {};
  if (earningsQuery.data && Array.isArray(earningsQuery.data)) {
    (earningsQuery.data as Earning[]).forEach((earning) => {
      if (!earningsBySource[earning.source]) {
        earningsBySource[earning.source] = { total: 0, count: 0 };
      }
      earningsBySource[earning.source].total += parseFloat(earning.amount);
      earningsBySource[earning.source].count += 1;
    });
  }

  // Calculate total earnings (simplified)
  const totalEarnings = Object.values(earningsBySource).reduce((sum, item) => sum + item.total, 0);

  // Revenue sources configuration
  const revenueSources = [
    {
      id: 'views',
      name: 'Vues vidéo',
      description: 'Basé sur les vues de tes vidéos',
      icon: '👁️',
      conditions: ['100+ vues par vidéo', 'Vidéo publique', 'Contenu original']
    },
    {
      id: 'likes',
      name: 'Likes',
      description: 'Gagné par les likes reçus',
      icon: '❤️',
      conditions: ['10+ likes par vidéo', 'Engagement authentique', 'Contenu de qualité']
    },
    {
      id: 'shares',
      name: 'Partages',
      description: 'Rémunération par partages',
      icon: '↗️',
      conditions: ['5+ partages par vidéo', 'Contenu viral', 'Engagement élevé']
    },
    {
      id: 'comments',
      name: 'Commentaires',
      description: 'Gagné par les commentaires',
      icon: '💬',
      conditions: ['5+ commentaires', 'Communauté active', 'Contenu engageant']
    },
    {
      id: 'gifts',
      name: 'Cadeaux en direct',
      description: 'Cadeaux reçus en live',
      icon: '🎁',
      conditions: ['Live activé', '100+ followers', 'Compte vérifié']
    },
    {
      id: 'sponsorship',
      name: 'Sponsorisation',
      description: 'Contrats de marques',
      icon: '🤝',
      conditions: ['1000+ followers', '100k+ vues (30j)', 'Niche établie']
    },
    {
      id: 'creator_fund',
      name: 'Fonds créateurs',
      description: 'Programme de partage des revenus',
      icon: '💰',
      conditions: ['500+ followers', '50k+ vues (30j)', 'Compte actif']
    },
    {
      id: 'auto_earn',
      name: 'Système automatique',
      description: 'Gagnez en regardant, likant, partageant',
      icon: '⚡',
      conditions: ['AUCUNE condition', 'Tout le monde peut gagner', 'Automatique']
    }
  ];

  // ================= VIDEO MODAL HANDLERS =================
  const handleVideoTap = (index: number) => {
    setSelectedVideoIndex(index);
  };

  const handleNextVideo = () => {
    if (selectedVideoIndex !== null && selectedVideoIndex < filteredVideos.length - 1) {
      setSelectedVideoIndex(selectedVideoIndex + 1);
    }
  };

  const handlePrevVideo = () => {
    if (selectedVideoIndex !== null && selectedVideoIndex > 0) {
      setSelectedVideoIndex(selectedVideoIndex - 1);
    }
  };

  const handleCloseVideo = () => {
    setSelectedVideoIndex(null);
  };

  // ================= RENDER =================
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/feed")}
          className="text-white hover:text-gray-300 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">{profile?.name || "Profil"}</h1>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-white hover:text-gray-300 transition relative"
        >
          <MoreVertical size={24} />
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-gray-900 rounded-lg shadow-lg z-50 w-48">
              {isOwnProfile && (
                <>
                  {/* Afritok Studio */}
                  <button
                    onClick={() => {
                      navigate("/afritok-studio");
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
                  >
                    <Flame size={16} className="text-red-500" />
                    Afritok Studio
                  </button>

                  {/* Balance */}
                  <button
                    onClick={() => {
                      navigate("/balance");
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
                  >
                    Solde
                  </button>

                  {/* QR Code */}
                  <button
                    onClick={() => {
                      navigate("/qr-code");
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
                  >
                    Ton code QR
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
                  >
                    Paramètres et confidentialité
                  </button>
                </>
              )}
              <button className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2">
                <Flag size={16} />
                Signaler
              </button>
              <button className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm flex items-center gap-2">
                <Lock size={16} />
                Bloquer
              </button>
            </div>
          )}
        </button>
      </header>

      {/* PROFILE HEADER */}
      <div className="px-4 py-6 border-b border-gray-800">
        {/* AVATAR & NAME */}
        <div className="flex items-start gap-4 mb-4">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-red-500"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
              {profile?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{profile?.name || "Utilisateur"}</h2>
            <p className="text-gray-400 text-sm">@{profile?.email?.split("@")[0] || "username"}</p>
            {profile?.country && (
              <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                <MapPin size={14} /> {profile.country}
              </p>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <button
                onClick={() => navigate("/upload")}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-semibold transition"
              >
                <Edit3 size={18} />
              </button>
            ) : (
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-4 py-2 rounded-full font-semibold transition flex items-center gap-2 ${
                  isFollowing
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={16} /> Following
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="flex gap-6 mb-4">
          <button onClick={() => setShowFollowing(true)} className="flex items-center gap-1 hover:text-red-500 transition">
            <span className="font-bold">{profile?.followingCount || 0}</span>
            <span className="text-gray-400 text-sm">abonnements</span>
          </button>
          <button onClick={() => setShowFollowers(true)} className="flex items-center gap-1 hover:text-red-500 transition">
            <span className="font-bold">{followerCount?.followers || 0}</span>
            <span className="text-gray-400 text-sm">abonnés</span>
          </button>
          <button onClick={() => setShowLikes(true)} className="flex items-center gap-1 hover:text-red-500 transition">
            <span className="font-bold">{totalLikes}</span>
            <span className="text-gray-400 text-sm">j'aime</span>
          </button>
        </div>

        {/* BIO */}
        {profile?.bio && (
          <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap">{profile.bio}</p>
        )}

        {/* MONETIZATION PROGRESS (if own profile) */}
        {isOwnProfile && (
          <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-red-500" />
                <span className="font-semibold text-sm">Monétisation</span>
              </div>
              <span className="text-red-500 font-bold text-sm">{totalEarnings.toFixed(2)} FCFA</span>
            </div>
            <MonetizationProgressBar
              current={followerCount?.followers || 0}
              target={1000}
              label="Abonnés requis"
            />
            <button
              onClick={() => setShowMonetization(true)}
              className="w-full mt-3 text-center text-xs text-gray-400 hover:text-white transition"
            >
              Voir les détails du programme →
            </button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab("videos")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
            activeTab === "videos" ? "border-white text-white" : "border-transparent text-gray-500"
          }`}
        >
          <Play size={18} />
          Vidéos
        </button>
        <button
          onClick={() => setActiveTab("likes")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
            activeTab === "likes" ? "border-white text-white" : "border-transparent text-gray-500"
          }`}
        >
          <Heart size={18} />
          J'aime
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
            activeTab === "favorites" ? "border-white text-white" : "border-transparent text-gray-500"
          }`}
        >
          <Lock size={18} />
          Privé
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-3 gap-0.5">
        {filteredVideos.map((video, index) => (
          <div
            key={video.id}
            className="aspect-[3/4] bg-gray-900 relative cursor-pointer group"
            onClick={() => handleVideoTap(index)}
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title || ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play size={24} className="text-gray-700" />
              </div>
            )}
            <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[10px] font-bold">
              <Play size={10} fill="white" />
              {video.views || 0}
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredVideos.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-gray-500">
          <div className="w-16 h-16 rounded-full border-2 border-gray-800 flex items-center justify-center mb-4">
            {activeTab === "videos" ? <Play size={32} /> : activeTab === "likes" ? <Heart size={32} /> : <Lock size={32} />}
          </div>
          <p className="text-lg font-semibold">Aucun contenu pour le moment</p>
          <p className="text-sm">Les vidéos apparaîtront ici.</p>
        </div>
      )}

      {/* MONETIZATION MODAL */}
      {showMonetization && (
        <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
          <div className="sticky top-0 bg-black/80 backdrop-blur p-4 border-b border-gray-800 flex items-center justify-between">
            <button onClick={() => setShowMonetization(false)} className="p-1">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg font-bold">Afritok Studio</h2>
            <div className="w-8" />
          </div>

          <div className="p-4">
            <div className="bg-gradient-to-br from-red-600 to-pink-600 rounded-2xl p-6 mb-6">
              <p className="text-white/80 text-sm mb-1">Solde estimé</p>
              <h3 className="text-4xl font-black text-white mb-4">{totalEarnings.toFixed(2)} FCFA</h3>
              <div className="flex gap-2">
                <button className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm">
                  Retirer
                </button>
                <button className="bg-black/20 text-white px-6 py-2 rounded-full font-bold text-sm backdrop-blur">
                  Historique
                </button>
              </div>
            </div>

            <h4 className="font-bold mb-4">Comment gagner de l'argent ?</h4>
            <div className="space-y-4">
              {revenueSources.map((source) => (
                <div key={source.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl bg-gray-800 w-12 h-12 rounded-lg flex items-center justify-center">
                      {source.icon}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold">{source.name}</h5>
                      <p className="text-gray-400 text-xs mb-3">{source.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {source.conditions.map((cond, i) => (
                          <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-1 rounded-md">
                            • {cond}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700 text-center">
              <p className="text-sm text-gray-400">
                Plus vous créez de contenu de qualité, plus vos revenus augmentent.
                Afritok récompense l'engagement authentique de sa communauté.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN VIDEO MODAL */}
      {selectedVideoIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black">
          <div className="absolute top-4 left-4 z-[110]">
            <button
              onClick={handleCloseVideo}
              className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white"
            >
              <ArrowLeft size={24} />
            </button>
          </div>

          <div className="h-full w-full flex items-center justify-center relative">
            <video
              src={filteredVideos[selectedVideoIndex].videoUrl}
              className="h-full w-full object-contain"
              autoPlay
              loop
              controls
            />

            {/* OVERLAY INFO */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-white font-bold text-lg mb-1">
                {filteredVideos[selectedVideoIndex].title || "Sans titre"}
              </h3>
              <p className="text-gray-300 text-sm line-clamp-2">
                {filteredVideos[selectedVideoIndex].description || "Pas de description"}
              </p>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex flex-col items-center">
                  <Heart size={28} />
                  <span className="text-xs mt-1">{filteredVideos[selectedVideoIndex].likes || 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <MessageCircle size={28} />
                  <span className="text-xs mt-1">{filteredVideos[selectedVideoIndex].comments || 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Share2 size={28} />
                  <span className="text-xs mt-1">{filteredVideos[selectedVideoIndex].shares || 0}</span>
                </div>
              </div>
            </div>

            {/* NAVIGATION BUTTONS */}
            <div className="absolute inset-y-0 left-0 w-1/4" onClick={handlePrevVideo} />
            <div className="absolute inset-y-0 right-0 w-1/4" onClick={handleNextVideo} />
          </div>
        </div>
      )}
    </div>
  );
}
