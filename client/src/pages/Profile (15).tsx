import { useAuth } from "@/_core/hooks/useAuth";
import { MonetizationProgressBar } from "@/components/MonetizationProgressBar";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, MapPin, Edit3, UserPlus, UserCheck, MoreVertical, Flame, Lock, Share, Flag, Eye } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

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
const { user: currentUser, token } = useAuth();
const [, navigate] = useLocation();
const [match, params] = useRoute("/profile/:userId");
const userId = params?.userId ? parseInt(params.userId) : currentUser?.id;
const isOwnProfile = currentUser?.id === userId;

// ================= STATE =================
const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
const [activeTab, setActiveTab] = useState<"videos" | "likes" | "favorites">("videos");
const [isFollowing, setIsFollowing] = useState(false);
const followMutation = trpc.follower.toggle.useMutation();
const [showMenu, setShowMenu] = useState(false);
const [showMonetization, setShowMonetization] = useState(false);
const [showFollowers, setShowFollowers] = useState(false);
const [showFollowing, setShowFollowing] = useState(false);
const [showLikes, setShowLikes] = useState(false);
const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

// ✅ AJOUTE : tRPC Query pour les gains
const earningsQuery = trpc.earnings.getMyEarnings.useQuery(undefined, {
enabled: isOwnProfile,
refetchInterval: 10000,
});

const earnings = earningsQuery.data;

if (!match) return null;

// ================= API QUERIES =================
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

const totalLikes = videos.reduce((sum, video) => sum + (video.likes || 0), 0);
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
<div className="absolute right-0 top-full mt-2 bg-gray-900 rounded-lg shadow-lg z-50 w-48">
{isOwnProfile && (
<>
<button
onClick={() => {
setShowMonetization(true);
setShowMenu(false);
}}
className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
>
<Flame size={16} className="text-red-500" />
Monétisation
</button>
<button
onClick={() => {
setShowMenu(false);
navigate("/settings");
}}
className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
>
Paramètres
</button>
</>
)}
<button
onClick={() => {
setShowMenu(false);
alert("Fonction Signaler bientôt disponible");
}}
className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
>
<Flag size={16} />
Signaler
</button>
<button
onClick={() => {
setShowMenu(false);
alert("Fonction Bloquer bientôt disponible");
}}
className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm flex items-center gap-2"
>
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

onClick={() => {
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

}}
className={`px-4 py-2 rounded-full font-semibold transition flex items-center gap-2 ${   isFollowing   ? "bg-gray-700 hover:bg-gray-600 text-white"   : "bg-red-500 hover:bg-red-600 text-white"   }`}
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

{profile?.bio && (  
      <p className="text-gray-300 text-sm mb-4">{profile.bio}</p>  
    )}  

    {isOwnProfile && (  
      <div className="flex items-center gap-2 mb-4 text-red-500 text-sm">  
        <Flame size={16} />  
        Afritok Studio  
      </div>  
    )}  

    <div className="flex justify-around py-4 border-t border-gray-800">  
      <button  
        onClick={() => setShowFollowing(true)}  
        className="text-center hover:opacity-80 transition"  
      >  
        <p className="text-2xl font-bold text-white">{followerCount?.following || 0}</p>  
        <p className="text-gray-400 text-xs">Suivis</p>  
      </button>  
      <button  
        onClick={() => setShowFollowers(true)}  
        className="text-center hover:opacity-80 transition"  
      >  
        <p className="text-2xl font-bold text-white">{followerCount?.followers || 0}</p>  
        <p className="text-gray-400 text-xs">Abonnés</p>  
      </button>  
      <button  
        onClick={() => setShowLikes(true)}  
        className="text-center hover:opacity-80 transition"  
      >  
        <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">  
          <Flame size={18} className="text-red-500" />  
          {totalLikes}  
        </p>  
        <p className="text-gray-400 text-xs">Likes</p>  
      </button>  
    </div>  

    {/* EARNINGS STATS (WALLET) */}  
    {isOwnProfile && (  
      <>  
        <div className="flex justify-around py-4 border-t border-gray-800">  
          <div className="text-center">  
            <p className="text-xl font-bold text-green-400">  
              ${Number(earnings?.total ?? 0).toFixed(2)}  
            </p>  
            <p className="text-gray-400 text-xs">Total gagné</p>  
          </div>  

          <div className="text-center">  
            <p className="text-xl font-bold text-white">  
              ${Number(earnings?.available ?? 0).toFixed(2)}  
            </p>  
            <p className="text-gray-400 text-xs">Disponible</p>  
          </div>  

          <div className="text-center">  
            <p className="text-xl font-bold text-yellow-400">  
              ${Number(earnings?.pending ?? 0).toFixed(2)}  
            </p>  
            <p className="text-gray-400 text-xs">En attente</p>  
          </div>  
        </div>  

        <div className="px-4 mt-4">  
          <Button  
            onClick={() => navigate("/instant-withdraw")}  
            disabled={!earnings || earnings.available <= 0}  
            className="w-full bg-green-500 hover:bg-green-600 text-white py-6 rounded-xl font-semibold transition text-lg"  
          >  
            💸 Retirer mon argent  
          </Button>  
        </div>  
      </>  
    )}  

    <div className="flex justify-around mt-4 pt-4 border-t border-gray-800">  
      <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">  
        <MoreVertical size={20} />  
        <span className="text-xs">Plus</span>  
      </button>  
      <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">  
        <Lock size={20} />  
        <span className="text-xs">Privé</span>  
      </button>  
      <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">  
        <Share2 size={20} />  
        <span className="text-xs">Partager</span>  
      </button>  
      <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">  
        <Heart size={20} />  
        <span className="text-xs">Favoris</span>  
      </button>  
    </div>  
  </div>  

  {/* TABS */}  
  <div className="sticky top-16 z-30 bg-black/80 backdrop-blur border-b border-gray-800 flex">  
    <button  
      onClick={() => setActiveTab("videos")}  
      className={`flex-1 py-3 font-semibold text-center transition ${  
        activeTab === "videos"  
          ? "text-white border-b-2 border-red-500"  
          : "text-gray-400 hover:text-white"  
      }`}  
    >  
      Vidéos  
    </button>  
    <button  
      onClick={() => setActiveTab("likes")}  
      className={`flex-1 py-3 font-semibold text-center transition ${  
        activeTab === "likes"  
          ? "text-white border-b-2 border-red-500"  
          : "text-gray-400 hover:text-white"  
      }`}  
    >  
      <Heart size={18} className="inline mr-1" /> Likes  
    </button>  
    <button  
      onClick={() => setActiveTab("favorites")}  
      className={`flex-1 py-3 font-semibold text-center transition ${  
        activeTab === "favorites"  
          ? "text-white border-b-2 border-red-500"  
          : "text-gray-400 hover:text-white"  
      }`}  
    >  
      Favoris  
    </button>  
  </div>  

  {/* VIDEOS GRID */}  
  <div className="px-1 py-4">  
    {filteredVideos.length === 0 ? (  
      <div className="text-center py-12">  
        <p className="text-gray-400 text-lg">  
          {isOwnProfile  
            ? "Vous n'avez pas encore uploadé de vidéo"  
            : "Cet utilisateur n'a pas encore uploadé de vidéo"}  
        </p>  
      </div>  
    ) : (  
      <div className="grid grid-cols-3 gap-1">  
        {filteredVideos.map((video, index) => (  
          <div  
            key={video.id}  
            onClick={() => handleVideoTap(index)}  
            className="relative aspect-square bg-gray-900 rounded-sm overflow-hidden cursor-pointer group"  
          >  
            <video  
              ref={(el) => (videoRefs.current[video.id] = el)}  
              src={video.videoUrl}  
              className="w-full h-full object-cover group-hover:opacity-75 transition"  
            />  
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">  
              <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition fill-white" />  
            </div>  
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">  
              <div className="flex items-center gap-1 text-white text-xs">  
                <Heart size={12} fill="white" />  
                {video.likes || 0}  
              </div>  
            </div>  
          </div>  
        ))}  
      </div>  
    )}  
  </div>  

  {/* FULLSCREEN VIDEO MODAL */}  
  {selectedVideoIndex !== null && filteredVideos[selectedVideoIndex] && (  
    <div className="fixed inset-0 bg-black z-50 flex flex-col">  
      <div className="absolute top-4 left-4 z-50">  
        <button  
          onClick={handleCloseVideo}  
          className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"  
        >  
          <ArrowLeft size={24} />  
        </button>  
      </div>  
      <div className="flex-1 flex items-center justify-center">  
        <video  
          key={filteredVideos[selectedVideoIndex].id}  
          src={filteredVideos[selectedVideoIndex].videoUrl}  
          autoPlay  
          loop  
          className="w-full h-full object-contain"  
        />  
      </div>  
      <div className="bg-black/80 backdrop-blur px-4 py-4 border-t border-gray-800">  
        <h3 className="text-white font-bold mb-2">{filteredVideos[selectedVideoIndex].title}</h3>  
        <p className="text-gray-300 text-sm mb-4">{filteredVideos[selectedVideoIndex].description}</p>  
        <div className="flex gap-6 text-gray-300 text-sm mb-4">  
          <div className="flex items-center gap-2">  
            <Heart size={16} />  
            {filteredVideos[selectedVideoIndex].likes || 0}  
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle size={16} />
            {filteredVideos[selectedVideoIndex].comments || 0}
          </div>
        </div>
      </div>
    </div>
  )}
</div>
);
}
