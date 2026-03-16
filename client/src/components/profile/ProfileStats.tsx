import { Flame } from "lucide-react";

interface ProfileStatsProps {
  profile: any;
  followerCount: any;
  totalLikes: number;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onLikesClick: () => void;
}

export default function ProfileStats({
  profile,
  followerCount,
  totalLikes,
  onFollowersClick,
  onFollowingClick,
  onLikesClick,
}: ProfileStatsProps) {
  return (
    <div className="px-4 py-4 border-b border-gray-800">
      {/* CLICKABLE STATS */}
      <div className="flex justify-around py-4 border-t border-gray-800">
        <button
          onClick={onFollowingClick}
          className="text-center hover:opacity-80 transition"
        >
          <p className="text-2xl font-bold text-white">{profile?.followingCount || 0}</p>
          <p className="text-gray-400 text-xs">Suivis</p>
        </button>
        <button
          onClick={onFollowersClick}
          className="text-center hover:opacity-80 transition"
        >
          <p className="text-2xl font-bold text-white">{followerCount?.followers || 0}</p>
          <p className="text-gray-400 text-xs">Abonnés</p>
        </button>
        <button
          onClick={onLikesClick}
          className="text-center hover:opacity-80 transition"
        >
          <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">
            <Flame size={18} className="text-red-500" />
            {totalLikes}
          </p>
          <p className="text-gray-400 text-xs">Likes</p>
        </button>
      </div>
    </div>
  );
}
