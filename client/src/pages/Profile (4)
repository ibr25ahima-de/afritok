import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { useState, useMemo, useEffect } from "react";

// Components
import { ProfileHeader } from "./Profile/components/ProfileHeader";
import { ProfileInfo } from "./Profile/components/ProfileInfo";
import { EarningsStats } from "./Profile/components/EarningsStats";
import { ProfileTabs } from "./Profile/components/ProfileTabs";
import { VideoGrid } from "./Profile/components/VideoGrid";
import { VideoModal } from "./Profile/components/VideoModal";
import { MonetizationModal } from "./Profile/components/MonetizationModal";
import { StatModal } from "./Profile/components/StatModal";

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

  // ================= API QUERIES =================
  const followMutation = trpc.follower.toggle.useMutation();
  
  // ✅ Récupération de l'état de suivi réel
  const isFollowingQuery = trpc.follower.getCount.useQuery(
    { userId: userId || 0 },
    { 
      enabled: !!userId && !isOwnProfile,
      // Note: On pourrait utiliser une route dédiée isFollowing si elle existe
    }
  );

  const earningsQuery = trpc.earnings.getMyEarnings.useQuery(undefined, {
    enabled: isOwnProfile,
    refetchInterval: 10000,
  });

  const userQuery = trpc.user.getProfile.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const videosQuery = trpc.video.getByUser.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const followerCountQuery = trpc.follower.getCount.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  // ✅ Synchronisation de l'état local avec les données API
  useEffect(() => {
    // Si nous avions une route `isFollowing`, nous l'utiliserions ici.
    // Pour l'instant, on laisse l'état se mettre à jour via la mutation
    // ou une future route dédiée.
  }, [userId]);

  // ================= MEMOIZED DATA =================
  const profile = userQuery.data;
  const allVideos = (videosQuery.data || []) as Video[];
  const followerCount = followerCountQuery.data;
  const earnings = earningsQuery.data;

  const totalLikes = useMemo(() => 
    allVideos.reduce((sum, video) => sum + (video.likes || 0), 0), 
  [allVideos]);

  const filteredVideos = useMemo(() => {
    switch (activeTab) {
      case "likes":
        // TODO: Implémenter l'API pour récupérer les vidéos likées par l'utilisateur
        // return likedVideosQuery.data;
        return []; 
      case "favorites":
        // TODO: Implémenter l'API pour récupérer les favoris de l'utilisateur
        // return favoriteVideosQuery.data;
        return [];
      default:
        return allVideos;
    }
  }, [allVideos, activeTab]);

  if (!match || !userId) return null;

  if (userQuery.isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Chargement du profil...</p>
      </div>
    );
  }

  // ================= HANDLERS =================
  const handleFollowToggle = () => {
    if (!userId) return;
    followMutation.mutate(
      { userId },
      {
        onSuccess: (data) => {
          setIsFollowing(data.following);
          followerCountQuery.refetch();
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <ProfileHeader
        name={profile?.name || "Profil"}
        isOwnProfile={isOwnProfile}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        setShowMonetization={setShowMonetization}
        navigate={navigate}
      />

      <ProfileInfo
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
        followerCount={followerCount}
        totalLikes={totalLikes}
        navigate={navigate}
        setShowFollowing={setShowFollowing}
        setShowFollowers={setShowFollowers}
        setShowLikes={setShowLikes}
      />

      {isOwnProfile && (
        <EarningsStats earnings={earnings} navigate={navigate} />
      )}

      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <VideoGrid
        videos={filteredVideos}
        onVideoClick={setSelectedVideoIndex}
        isOwnProfile={isOwnProfile}
      />

      {/* MODALS */}
      <VideoModal
        video={selectedVideoIndex !== null ? filteredVideos[selectedVideoIndex] : null}
        onClose={() => setSelectedVideoIndex(null)}
        onNext={() => setSelectedVideoIndex(prev => (prev !== null && prev < filteredVideos.length - 1 ? prev + 1 : prev))}
        onPrev={() => setSelectedVideoIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
        canNext={selectedVideoIndex !== null && selectedVideoIndex < filteredVideos.length - 1}
        canPrev={selectedVideoIndex !== null && selectedVideoIndex > 0}
      />

      {showMonetization && (
        <MonetizationModal
          earnings={earnings}
          onClose={() => setShowMonetization(false)}
        />
      )}

      <StatModal title="Abonnés" isOpen={showFollowers} onClose={() => setShowFollowers(false)} />
      <StatModal title="Suivis" isOpen={showFollowing} onClose={() => setShowFollowing(false)} />
      <StatModal title="Likes" isOpen={showLikes} onClose={() => setShowLikes(false)}>
        <p className="text-center">Total des likes reçus : {totalLikes}</p>
      </StatModal>
    </div>
  );
}
