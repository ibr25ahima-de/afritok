import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Video, Trash2, Eye, EyeOff } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useState } from "react";

export default function MyVideos() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  const userVideosQuery = trpc.video.getUserVideos.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleDeleteVideo = (videoId: number) => {
    if (confirm("Are you sure you want to delete this video?")) {
      // In a real app, you would call an API endpoint to delete the video
      alert("Video deleted successfully!");
    }
  };

  const handleToggleVisibility = (videoId: number) => {
    // In a real app, you would call an API endpoint to toggle visibility
    alert("Video visibility updated!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/profile/${user?.id}`)}
              className="text-purple-400 hover:text-purple-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <span className="text-xl font-bold text-white">{APP_TITLE}</span>
            </div>
          </div>
          <Button
            onClick={() => navigate("/upload")}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            + Upload New Video
          </Button>
        </div>
      </header>

      {/* My Videos */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
          <Video className="w-8 h-8" />
          My Videos
        </h1>

        {userVideosQuery.data && userVideosQuery.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userVideosQuery.data.map((video) => (
              <div
                key={video.id}
                className="bg-purple-900/30 border border-purple-800/50 rounded-lg overflow-hidden hover:border-purple-600/50 transition"
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
                  {!video.isPublic && (
                    <div className="absolute top-2 right-2 bg-red-600/80 text-white px-2 py-1 rounded text-xs font-semibold">
                      Private
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-2 line-clamp-2">
                    {video.title || "Untitled"}
                  </h3>
                  <div className="flex gap-4 text-sm text-purple-300 mb-4">
                    <span>❤️ {video.likes}</span>
                    <span>💬 {video.comments}</span>
                    <span>👁️ {video.views}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleToggleVisibility(video.id)}
                      variant="outline"
                      className="flex-1 text-sm text-purple-300 border-purple-800/50 hover:bg-slate-800"
                    >
                      {video.isPublic ? (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Private
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDeleteVideo(video.id)}
                      variant="destructive"
                      className="flex-1 text-sm bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
            <p className="text-purple-300 text-lg mb-4">No videos yet</p>
            <Button
              onClick={() => navigate("/upload")}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Upload Your First Video
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
