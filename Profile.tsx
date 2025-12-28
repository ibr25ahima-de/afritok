import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation, useRoute } from "wouter";
import { User, Users, Video, ArrowLeft, Edit2 } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Profile() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/profile/:userId");
  const userId = parseInt(params?.userId || "0");

  const userVideosQuery = trpc.video.getUserVideos.useQuery({ userId });
  const followerCountQuery = trpc.follower.count.useQuery({ userId });
  const isFollowingQuery = trpc.follower.isFollowing.useQuery(
    { userId },
    { enabled: user?.id !== userId }
  );
  const toggleFollowMutation = trpc.follower.toggle.useMutation();
  const isOwnProfile = user?.id === userId;

  const handleFollowToggle = async () => {
    await toggleFollowMutation.mutateAsync({ userId });
    isFollowingQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/feed")}
              className="text-purple-400 hover:text-purple-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <span className="text-xl font-bold text-white">{APP_TITLE}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Creator #{userId}</h1>
                <p className="text-purple-200 mb-4">African Content Creator</p>
                <div className="flex gap-8">
                  <div>
                    <p className="text-2xl font-bold text-purple-400">
                      {userVideosQuery.data?.length || 0}
                    </p>
                    <p className="text-sm text-purple-300">Videos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">
                      {followerCountQuery.data?.followers || 0}
                    </p>
                    <p className="text-sm text-purple-300">Followers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">
                      {followerCountQuery.data?.following || 0}
                    </p>
                    <p className="text-sm text-purple-300">Following</p>
                  </div>
                </div>
              </div>
            </div>
            {isOwnProfile ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/my-videos")}
                  className="bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  My Videos
                </Button>
                <Button
                  onClick={() => navigate("/edit-profile")}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleFollowToggle}
                className={`${
                  isFollowingQuery.data
                    ? "bg-purple-900 text-purple-400 border border-purple-600"
                    : "bg-purple-600 text-white"
                }`}
              >
                {isFollowingQuery.data ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        {/* Videos Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Video className="w-6 h-6" />
            Videos
          </h2>
          {userVideosQuery.data && userVideosQuery.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userVideosQuery.data.map((video) => (
                <div
                  key={video.id}
                  className="bg-purple-900/30 border border-purple-800/50 rounded-lg overflow-hidden hover:border-purple-600/50 transition cursor-pointer"
                >
                  <div className="relative bg-black h-48">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title || "Video"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-2 line-clamp-2">
                      {video.title || "Untitled"}
                    </h3>
                    <div className="flex gap-4 text-sm text-purple-300">
                      <span>❤️ {video.likes}</span>
                      <span>💬 {video.comments}</span>
                      <span>👁️ {video.views}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-purple-300">No videos yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
