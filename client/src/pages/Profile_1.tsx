import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Play, Heart, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/profile/:userId");
  const userId = params?.userId ? parseInt(params.userId) : currentUser?.id;

  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);

  if (!match) return null;

  // Fetch user profile
  const userQuery = trpc.user.getProfile.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  // Fetch user videos
  const videosQuery = trpc.video.getUserVideos.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  // Fetch follower count
  const followerCountQuery = trpc.follower.getCount.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const isOwnProfile = currentUser?.id === userId;

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <p>Profil non trouvé</p>
      </div>
    );
  }

  if (userQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <p>Chargement du profil...</p>
      </div>
    );
  }

  const profile = userQuery.data;
  const videos = videosQuery.data || [];
  const followerCount = followerCountQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/feed")}
            className="text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Profil</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* Profile Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-purple-600"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profile?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <h2 className="text-3xl font-bold text-white">{profile?.name || "Utilisateur"}</h2>
                  <p className="text-purple-400">@{profile?.phone}</p>
                  {profile?.country && (
                    <p className="text-purple-300 text-sm mt-1">📍 {profile.country}</p>
                  )}
                </div>
              </div>

              {profile?.bio && (
                <p className="text-purple-200 mb-4">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex gap-8 mb-6">
                <div>
                  <p className="text-2xl font-bold text-white">{videos.length}</p>
                  <p className="text-purple-400 text-sm">Vidéos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{followerCount?.followers || 0}</p>
                  <p className="text-purple-400 text-sm">Abonnés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{followerCount?.following || 0}</p>
                  <p className="text-purple-400 text-sm">Abonnements</p>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <Button
                onClick={() => navigate("/upload")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              >
                Télécharger une vidéo
              </Button>
            )}
          </div>
        </div>

        {/* Videos Grid */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Vidéos</h3>

          {videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-purple-400 text-lg">
                {isOwnProfile
                  ? "Vous n'avez pas encore uploadé de vidéo"
                  : "Cet utilisateur n'a pas encore uploadé de vidéo"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video.id)}
                  className="group cursor-pointer rounded-lg overflow-hidden bg-slate-800 hover:bg-slate-700 transition"
                >
                  <div className="relative aspect-video bg-black flex items-center justify-center">
                    {video.videoUrl ? (
                      <>
                        <video
                          src={video.videoUrl}
                          className="w-full h-full object-cover group-hover:opacity-75 transition"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Play className="w-12 h-12 text-white fill-white" />
                        </div>
                      </>
                    ) : (
                      <p className="text-purple-400">Vidéo indisponible</p>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-white truncate">{video.title}</h4>
                    <p className="text-purple-400 text-sm truncate">{video.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-purple-400 text-sm">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {video.likes || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {video.comments || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="w-4 h-4" />
                        {video.shares || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {videos.find((v) => v.id === selectedVideo) && (
              <div className="p-6">
                <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center">
                  <video
                    src={videos.find((v) => v.id === selectedVideo)?.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full rounded-lg"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {videos.find((v) => v.id === selectedVideo)?.title}
                </h2>
                <p className="text-purple-300 mb-4">
                  {videos.find((v) => v.id === selectedVideo)?.description}
                </p>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
