import { MapPin, Edit3, UserPlus, UserCheck, Flame } from "lucide-react";

interface UserProfile {
  id: number;
  name: string;
  email?: string;
  avatarUrl?: string;
  country?: string;
  bio?: string;
}

interface FollowerCount {
  followers: number;
  following: number;
}

interface ProfileInfoProps {
  profile: UserProfile | null | undefined;
  isOwnProfile: boolean;
  isFollowing: boolean;
  onFollowToggle: () => void;
  followerCount: FollowerCount | null | undefined;
  totalLikes: number;
  navigate: (path: string) => void;
  setShowFollowing: (show: boolean) => void;
  setShowFollowers: (show: boolean) => void;
  setShowLikes: (show: boolean) => void;
}

export function ProfileInfo({
  profile,
  isOwnProfile,
  isFollowing,
  onFollowToggle,
  followerCount,
  totalLikes,
  navigate,
  setShowFollowing,
  setShowFollowers,
  setShowLikes,
}: ProfileInfoProps) {
  return (
    <div className="px-4 py-6 border-b border-gray-800">
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
              onClick={onFollowToggle}
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

      {profile?.bio && <p className="text-gray-300 text-sm mb-4">{profile.bio}</p>}

      {isOwnProfile && (
        <div className="flex items-center gap-2 mb-4 text-red-500 text-sm">
          <Flame size={16} />
          Afritok Studio
        </div>
      )}

      <div className="flex justify-around py-4 border-t border-gray-800">
        <button onClick={() => setShowFollowing(true)} className="text-center hover:opacity-80 transition">
          <p className="text-2xl font-bold text-white">{followerCount?.following || 0}</p>
          <p className="text-gray-400 text-xs">Suivis</p>
        </button>
        <button onClick={() => setShowFollowers(true)} className="text-center hover:opacity-80 transition">
          <p className="text-2xl font-bold text-white">{followerCount?.followers || 0}</p>
          <p className="text-gray-400 text-xs">Abonnés</p>
        </button>
        <button onClick={() => setShowLikes(true)} className="text-center hover:opacity-80 transition">
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
