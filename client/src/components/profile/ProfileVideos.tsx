import { Heart, Play } from "lucide-react";

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

interface ProfileVideosProps {
  activeTab: "videos" | "likes" | "favorites";
  onTabChange: (tab: "videos" | "likes" | "favorites") => void;
  filteredVideos: Video[];
  onVideoTap: (index: number) => void;
  isOwnProfile: boolean;
}

export default function ProfileVideos({
  activeTab,
  onTabChange,
  filteredVideos,
  onVideoTap,
  isOwnProfile,
}: ProfileVideosProps) {
  return (
    <>
      {/* TABS */}
      <div className="sticky top-16 z-30 bg-black/80 backdrop-blur border-b border-gray-800 flex">
        <button
          onClick={() => onTabChange("videos")}
          className={`flex-1 py-3 font-semibold text-center transition ${
            activeTab === "videos"
              ? "text-white border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Vidéos
        </button>
        <button
          onClick={() => onTabChange("likes")}
          className={`flex-1 py-3 font-semibold text-center transition ${
            activeTab === "likes"
              ? "text-white border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Heart size={18} className="inline mr-1" /> Likes
        </button>
        <button
          onClick={() => onTabChange("favorites")}
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
                onClick={() => onVideoTap(index)}
                className="relative aspect-square bg-gray-900 rounded-sm overflow-hidden cursor-pointer group"
              >
                {/* VIDEO THUMBNAIL */}
                <video
                  src={video.videoUrl}
                  className="w-full h-full object-cover group-hover:opacity-75 transition"
                />

                {/* OVERLAY */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition fill-white" />
                </div>

                {/* VIDEO STATS */}
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
    </>
  );
}
