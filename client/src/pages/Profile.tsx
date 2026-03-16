import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { useState, useRef } from "react";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileVideos from "@/components/profile/ProfileVideos";
import ProfileMonetization from "@/components/profile/ProfileMonetization";
import { ArrowLeft } from "lucide-react";

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

  // Ensure all data has safe defaults
  const profile = userQuery.data || {};
  const videos = Array.isArray(videosQuery.data) ? videosQuery.data : [];
  const followerCount = followerCountQuery.data || { followers: 0 };

  // Calculate total likes from all videos
  const totalLikes = videos && Array.isArray(videos) && videos.length > 0
    ? videos.reduce((sum, video) => sum + (video?.likes || 0), 0)
    : 0;

  // Filter videos based on active tab
  const filteredVideos = Array.isArray(videos) ? videos : [];

  // Calculate earnings by source (simplified)
  const earningsData = Array.isArray(earningsQuery.data) ? earningsQuery.data : [];
  const earningsBySource: Record<string, { total: number; count: number }> = {};

  if (earningsData && Array.isArray(earningsData) && earningsData.length > 0) {
    earningsData.forEach((earning: Earning) => {
      if (earning && earning.source) {
        if (!earningsBySource[earning.source]) {
          earningsBySource[earning.source] = { total: 0, count: 0 };
        }
        earningsBySource[earning.source].total += parseFloat(earning.amount || "0");
        earningsBySource[earning.source].count += 1;
      }
    });
  }

  // Calculate total earnings (simplified)
  const earningsValues = Object.values(earningsBySource || {});
  const totalEarnings = earningsValues && Array.isArray(earningsValues) && earningsValues.length > 0
    ? earningsValues.reduce(
        (sum: number, item: any) => sum + (item?.total || 0),
        0
      )
    : 0;

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
      {/* PROFILE COMPONENTS */}
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        showMenu={showMenu}
        onMenuToggle={setShowMenu}
        onFollowToggle={() => setIsFollowing(!isFollowing)}
      />

      <ProfileStats
        profile={profile}
        followerCount={followerCount}
        totalLikes={totalLikes}
        onFollowersClick={() => setShowFollowers(true)}
        onFollowingClick={() => setShowFollowing(true)}
        onLikesClick={() => setShowLikes(true)}
      />

      <ProfileVideos
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filteredVideos={filteredVideos}
        onVideoTap={handleVideoTap}
        isOwnProfile={isOwnProfile}
      />

      <ProfileMonetization
        isOwnProfile={isOwnProfile}
        showMonetization={showMonetization}
        onMonetizationToggle={setShowMonetization}
        totalEarnings={totalEarnings}
        revenueSources={revenueSources}
      />

      {/* FULLSCREEN VIDEO MODAL */}
      {selectedVideoIndex !== null && filteredVideos[selectedVideoIndex] && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* CLOSE BUTTON */}
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={handleCloseVideo}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
            >
              <ArrowLeft size={24} />
            </button>
          </div>

          {/* VIDEO PLAYER */}
          <div className="flex-1 flex items-center justify-center">
            <video
              key={filteredVideos[selectedVideoIndex].id}
              src={filteredVideos[selectedVideoIndex].videoUrl}
              autoPlay
              loop
              className="w-full h-full object-contain"
              onTouchStart={(e) => {
                const startY = e.touches[0].clientY;
                const handleTouchEnd = (endEvent: TouchEvent) => {
                  const endY = endEvent.changedTouches[0].clientY;
                  const distance = startY - endY;

                  if (distance > 50) {
                    handleNextVideo();
                  } else if (distance < -50) {
                    handlePrevVideo();
                  }

                  document.removeEventListener("touchend", handleTouchEnd);
                };
                document.addEventListener("touchend", handleTouchEnd);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
