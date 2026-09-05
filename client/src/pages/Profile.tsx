import { useAuth } from "@/_core/hooks/useAuth";
import { PremiumBadge } from "@/components/PremiumBadge";
import { trpc } from "@/lib/trpc";
import { LiveStatusBadge } from "@/features/live/LiveStatusBadge";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Edit3, UserPlus, UserCheck, MoreVertical, MapPin, Eye, X, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface Video { id:number; userId:number; title:string|null; description:string|null; videoUrl:string; thumbnailUrl:string|null; duration:number|null; views:number|null; likes:number|null; comments:number|null; shares:number|null; favorites:number|null; createdAt:Date; }

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/profile/:userId");

  const currentUserId = Number(currentUser?.id ?? 0);
  const routeUserId = params?.userId ? Number(params.userId) : 0;
  const profileUserId = routeUserId > 0 ? routeUserId : currentUserId;
  const isOwnProfile = currentUserId > 0 && currentUserId === profileUserId;

  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"videos"|"likes"|"favorites">("videos");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();
  const followMutation = trpc.follower.toggle.useMutation();
  const deleteVideoMutation = trpc.video.delete.useMutation();
  const userQuery = trpc.user.getProfile.useQuery({ userId: profileUserId }, { enabled: profileUserId > 0 });
  const videosQuery = trpc.video.getByUser.useQuery({ userId: profileUserId }, { enabled: profileUserId > 0 });
  const likedQuery = trpc.like.getMyLikedVideos.useQuery(undefined, { enabled: isOwnProfile && activeTab === "likes" });
  const favoritesQuery = trpc.favorite.getMyVideos.useQuery(undefined, { enabled: isOwnProfile && activeTab === "favorites" });
  const followerCountQuery = trpc.follower.getCount.useQuery({ userId: profileUserId }, { enabled: profileUserId > 0 });

  if (profileUserId <= 0) return <div className="h-[100dvh] bg-black text-white flex items-center justify-center"><p>Profil non trouvé</p></div>;
  if (userQuery.isLoading) return <div className="h-[100dvh] bg-black text-white flex items-center justify-center"><p>Chargement du profil...</p></div>;

  const profile = userQuery.data;
  const ownVideos = (videosQuery.data || []) as Video[];
  const followerStats = followerCountQuery.data;
  const followerCount = typeof followerStats === "number" ? followerStats : followerStats?.followers;
  const totalLikes = ownVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const likedVideos = (likedQuery.data || []).map((x:any) => x.video).filter(Boolean) as Video[];
  const favoriteVideos = (favoritesQuery.data || []).map((x:any) => x.video).filter(Boolean) as Video[];
  const filteredVideos = activeTab === "likes" && isOwnProfile ? likedVideos : activeTab === "favorites" && isOwnProfile ? favoriteVideos : ownVideos;
  const selectedVideo = selectedVideoId === null ? null : ownVideos.find(v => v.id === selectedVideoId) || null;

  const startVideoLongPress = (video: Video) => {
    if (!isOwnProfile || activeTab !== "videos") return;
    longPressTimer.current = setTimeout(() => setSelectedVideoId(video.id), 550);
  };

  const cancelVideoLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const closeVideoOptions = () => setSelectedVideoId(null);

  const handleDeleteVideo = async () => {
    if (!selectedVideo || !isOwnProfile || deleteVideoMutation.isPending) return;
    const videoId = selectedVideo.id;
    try {
      await deleteVideoMutation.mutateAsync({ videoId });
      closeVideoOptions();
      await Promise.all([
        videosQuery.refetch(),
        utils.video.getByUser.invalidate({ userId: profileUserId }),
        utils.feed.getFeed.invalidate(),
        utils.like.getMyLikedVideos.invalidate(),
        utils.favorite.getMyVideos.invalidate(),
      ]);
      toast.success("Vidéo supprimée");
    } catch (error) {
      console.error("[Profile] delete video failed", error);
      toast.error(error instanceof Error ? error.message : "La suppression a échoué. Réessaie.");
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-black text-white overflow-hidden overscroll-none">
      <div className="h-full w-full overflow-y-scroll overscroll-y-contain touch-pan-y [webkit-overflow-scrolling:touch] pb-28">
        <header className="sticky top-0 z-40 bg-black/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <button type="button" onClick={() => navigate("/feed")} className="text-white"><ArrowLeft size={24}/></button>
          <h1 className="text-lg font-bold">{profile?.name || "Profil"}</h1>
          <button type="button" onClick={() => setShowMenu(v => !v)} className="text-white relative"><MoreVertical size={24}/>
            {showMenu && <div className="absolute right-0 top-full mt-2 bg-gray-900 rounded-lg shadow-lg z-50 w-48">
              <button type="button" className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700">Signaler</button>
              <button type="button" className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm">Bloquer</button>
            </div>}
          </button>
        </header>

        <section className="px-4 py-6 border-b border-gray-800">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name || "Profil"} className="w-20 h-20 rounded-full object-cover border-2 border-red-500"/> : <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">{profile?.name?.[0]?.toUpperCase() || "U"}</div>}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2"><LiveStatusBadge userId={profileUserId}/></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap"><h2 className="text-2xl font-bold">{profile?.name || "Utilisateur"}</h2><PremiumBadge compact/></div>
              {profile?.country && <p className="text-gray-400 text-sm flex items-center gap-1 mt-1"><MapPin size={14}/>{profile.country}</p>}
            </div>
            {isOwnProfile ? <button type="button" onClick={() => navigate("/edit-profile")} className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold"><Edit3 size={18}/></button> : <button type="button" onClick={() => followMutation.mutate({userId: profileUserId}, {onSuccess:r => setIsFollowing(Boolean(r.following))})} className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">{isFollowing ? <UserCheck size={18}/> : <UserPlus size={18}/>}</button>}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center mt-5">
            <div><p className="text-2xl font-bold">{ownVideos.length}</p><p className="text-gray-400 text-sm">Vidéos</p></div>
            <div><p className="text-2xl font-bold">{totalLikes}</p><p className="text-gray-400 text-sm">Likes</p></div>
            <div><p className="text-2xl font-bold">{followerCount ?? "—"}</p><p className="text-gray-400 text-sm">Abonnés</p></div>
          </div>
        </section>

        <div className="sticky top-[57px] z-30 grid grid-cols-3 border-b border-gray-800 bg-black">
          <button type="button" onClick={() => setActiveTab("videos")} className={`py-3 ${activeTab === "videos" ? "border-b-2 border-red-500" : "text-gray-500"}`}>Vidéos</button>
          <button type="button" onClick={() => setActiveTab("likes")} className={`py-3 ${activeTab === "likes" ? "border-b-2 border-red-500" : "text-gray-500"}`}>J'aime</button>
          <button type="button" onClick={() => setActiveTab("favorites")} className={`py-3 ${activeTab === "favorites" ? "border-b-2 border-red-500" : "text-gray-500"}`}>Favoris</button>
        </div>

        <main className="grid grid-cols-3 gap-1 p-1 pb-10">
          {filteredVideos.map(video => (
            <div key={video.id} className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
              <button type="button" onPointerDown={() => startVideoLongPress(video)} onPointerUp={cancelVideoLongPress} onPointerCancel={cancelVideoLongPress} onPointerLeave={cancelVideoLongPress} onContextMenu={event => event.preventDefault()} className="absolute inset-0 z-10 w-full h-full cursor-pointer touch-manipulation" aria-label={isOwnProfile && activeTab === "videos" ? "Maintenir appuyé pour gérer la vidéo" : "Voir la vidéo"}>
                <video src={video.videoUrl} muted playsInline preload="metadata" className="w-full h-full object-cover pointer-events-none"/>
              </button>
              <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-2 pt-5 pb-1 text-left text-xs pointer-events-none"><span className="flex items-center gap-1"><Eye size={13}/>{video.views || 0} vues</span></div>
            </div>
          ))}
        </main>

        {selectedVideo && isOwnProfile && activeTab === "videos" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5">
            <div className="absolute inset-0" aria-hidden="true" />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700"><h3 className="text-base font-semibold">Options de la vidéo</h3><button type="button" onClick={closeVideoOptions} className="p-1 text-gray-400 hover:text-white" aria-label="Fermer"><X size={20}/></button></div>
              <div className="p-4">
                <button type="button" onClick={handleDeleteVideo} disabled={deleteVideoMutation.isPending} className="w-full rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-3 font-semibold text-white flex items-center justify-center gap-2"><Trash2 size={18}/>{deleteVideoMutation.isPending ? "Suppression…" : "Supprimer"}</button>
                <button type="button" onClick={closeVideoOptions} disabled={deleteVideoMutation.isPending} className="w-full mt-3 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-4 py-3 font-semibold text-white">Annuler</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
