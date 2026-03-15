import { useAuth } from "@/_core/hooks/useAuth";
import { MonetizationProgressBar } from "@/components/MonetizationProgressBar";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, MapPin, Edit3, UserPlus, UserCheck, MoreVertical, Flame, Lock, Share, Flag, Eye, Users, QrCode, Settings as SettingsIcon, LogOut } from "lucide-react";
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
  const { user: currentUser, logout } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/profile/:userId");
  const userId = params?.userId ? parseInt(params.userId) : currentUser?.id;
  const isOwnProfile = currentUser?.id === userId;

  // ================= STATE =================
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "likes" | "favorites">("videos");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
            <div className="absolute right-0 top-full mt-2 bg-gray-900 rounded-lg shadow-lg z-50 w-56 border border-gray-800">
              {isOwnProfile && (
                <>
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
                  <button
                    onClick={() => {
                      navigate("/balance");
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
                  >
                    <Eye size={16} className="text-green-500" />
                    Solde
                  </button>
                  <button
                    onClick={() => {
                      navigate("/qr-code");
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
                  >
                    <QrCode size={16} className="text-blue-500" />
                    Ton code QR
                  </button>
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
                  >
                    <SettingsIcon size={16} className="text-purple-500" />
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
                onClick={() => navigate("/edit-profile")}
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
        <div className="grid grid-cols-3 gap-4 mb-4">
          <button
            onClick={() => {}}
            className="text-center hover:opacity-80 transition"
          >
            <p className="text-2xl font-bold text-white">{videos.length}</p>
            <p className="text-gray-400 text-sm">Vidéos</p>
          </button>
          <button
            onClick={() => {}}
            className="text-center hover:opacity-80 transition"
          >
            <p className="text-2xl font-bold text-white">{followerCount?.followers || 0}</p>
            <p className="text-gray-400 text-sm">Abonnés</p>
          </button>
          <button
            onClick={() => {}}
            className="text-center hover:opacity-80 transition"
          >
            <p className="text-2xl font-bold text-white">{totalLikes}</p>
            <p className="text-gray-400 text-sm">Likes</p>
          </button>
        </div>

        {/* BIO */}
        {profile?.bio && (
          <p className="text-gray-300 text-sm mb-2">{profile.bio}</p>
        )}
      </div>

      {/* TABS */}
      <div className="sticky top-16 z-30 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("videos")}
          className={`pb-2 font-semibold whitespace-nowrap transition ${
            activeTab === "videos"
              ? "text-white border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📹 Vidéos
        </button>
        <button
          onClick={() => setActiveTab("likes")}
          className={`pb-2 font-semibold whitespace-nowrap transition ${
            activeTab === "likes"
              ? "text-white border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ❤️ Likes
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`pb-2 font-semibold whitespace-nowrap transition ${
            activeTab === "favorites"
              ? "text-white border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ⭐ Favoris
        </button>
      </div>

      {/* VIDEO GRID */}
      <div className="px-2 py-4">
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {filteredVideos.map((video, index) => (
              <div
                key={video.id}
                onClick={() => handleVideoTap(index)}
                className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden cursor-pointer group"
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title || "Video"}
                    className="w-full h-full object-cover group-hover:opacity-80 transition"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <Play size={32} className="text-gray-600" />
                  </div>
                )}

                {/* OVERLAY */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <Play size={32} className="text-white opacity-0 group-hover:opacity-100 transition" />
                </div>

                {/* STATS */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                  <p className="text-white text-xs font-semibold flex items-center gap-1">
                    <Eye size={12} /> {video.views || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Aucune vidéo</p>
          </div>
        )}
      </div>

      {/* FULLSCREEN VIDEO MODAL */}
      {selectedVideoIndex !== null && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="w-full h-full flex flex-col">
            {/* CLOSE BUTTON */}
            <div className="absolute top-4 left-4 z-50">
              <button
                onClick={handleCloseVideo}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
              >
                <ArrowLeft size={24} />
              </button>
            </div>

            {/* VIDEO */}
            <div className="flex-1 flex items-center justify-center">
              {filteredVideos[selectedVideoIndex] && (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current[selectedVideoIndex] = el;
                  }}
                  src={filteredVideos[selectedVideoIndex].videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* NAVIGATION */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-4">
              <button
                onClick={handlePrevVideo}
                disabled={selectedVideoIndex === 0}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition disabled:opacity-50"
              >
                <ArrowLeft size={24} />
              </button>

              <p className="text-white font-semibold">
                {selectedVideoIndex + 1} / {filteredVideos.length}
              </p>

              <button
                onClick={handleNextVideo}
                disabled={selectedVideoIndex === filteredVideos.length - 1}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition disabled:opacity-50"
              >
                <ArrowLeft size={24} className="rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
