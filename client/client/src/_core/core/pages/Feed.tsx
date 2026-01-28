import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Share2, User, Loader2, Search, Bell } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import CommentsModal from "@/components/CommentsModal";
import ShareModal from "@/components/ShareModal";

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
  createdAt: Date;
}

export default function Feed() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const feedQuery = trpc.video.feed.useQuery({ limit: 20, offset });
  const likeToggleMutation = trpc.like.toggle.useMutation();
  const isLikedQuery = trpc.like.isLiked.useQuery(
    { videoId: videos[currentVideoIndex]?.id || 0 },
    { enabled: isAuthenticated && videos.length > 0 }
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (feedQuery.data) {
      setVideos((prev) => [...prev, ...feedQuery.data]);
    }
  }, [feedQuery.data]);

  const currentVideo = videos[currentVideoIndex];

  const handleLike = async () => {
    if (!currentVideo) return;
    await likeToggleMutation.mutateAsync({ videoId: currentVideo.id });
    setLikedVideos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentVideo.id)) {
        newSet.delete(currentVideo.id);
      } else {
        newSet.add(currentVideo.id);
      }
      return newSet;
    });
  };

  const handleShare = () => {
    if (navigator.share && currentVideo) {
      navigator.share({
        title: currentVideo.title || "Check out this video on Afritok",
        text: currentVideo.description || "",
        url: window.location.href,
      });
    }
  };

  const handleScroll = () => {
    if (currentVideoIndex === videos.length - 1 && !feedQuery.isLoading) {
      setOffset((prev) => prev + 20);
    }
  };

  const goToNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
      handleScroll();
    }
  };

  const goToPreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex((prev) => prev - 1);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <span className="text-xl font-bold text-white">{APP_TITLE}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/notifications")}
              className="text-white hover:bg-gray-900"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/search")}
              className="text-white hover:bg-gray-900"
              title="Search"
            >
              🔍
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/trending")}
              className="text-white hover:bg-gray-900"
              title="Trending"
            >
              🔥
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/upload")}
              className="text-white hover:bg-gray-900"
              title="Upload"
            >
              📤
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(`/profile/${user?.id}`)}
              className="text-white hover:bg-gray-900"
              title="Profile"
            >
              <User className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/monetization")}
              className="text-white hover:bg-gray-900"
              title="Monetization"
            >
              💰
            </Button>
          </div>
        </div>
      </header>

      {/* Main Feed */}
      <div className="pt-16 h-screen flex items-center justify-center overflow-hidden">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin w-8 h-8 text-purple-400" />
            <p className="text-gray-400">Loading videos...</p>
          </div>
        ) : (
          <div className="relative w-full h-full max-w-md mx-auto">
            {/* Video Container */}
            <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
              {currentVideo && (
                <>
                  {/* Video Player */}
                  <video
                    key={currentVideo.id}
                    src={currentVideo.videoUrl}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    loop
                  />

                  {/* Overlay Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6">
                    <h2 className="text-white font-semibold text-lg mb-2">
                      {currentVideo.title || "Untitled"}
                    </h2>
                    <p className="text-gray-300 text-sm mb-4">
                      {currentVideo.description || ""}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute right-4 bottom-32 flex flex-col gap-4">
                    <button
                      onClick={handleLike}
                      className={`flex flex-col items-center gap-2 p-3 rounded-full transition ${
                        likedVideos.has(currentVideo.id)
                          ? "bg-red-600/20 text-red-500"
                          : "bg-gray-900/50 text-white hover:bg-gray-900"
                      }`}
                    >
                      <Heart
                        className="w-6 h-6"
                        fill={likedVideos.has(currentVideo.id) ? "currentColor" : "none"}
                      />
                      <span className="text-xs">{currentVideo.likes}</span>
                    </button>

                    <button
                      onClick={() => setShowComments(true)}
                      className="flex flex-col items-center gap-2 p-3 rounded-full bg-gray-900/50 text-white hover:bg-gray-900 transition"
                    >
                      <MessageCircle className="w-6 h-6" />
                      <span className="text-xs">{currentVideo.comments}</span>
                    </button>

                    <button
                      onClick={() => setShowShare(true)}
                      className="flex flex-col items-center gap-2 p-3 rounded-full bg-gray-900/50 text-white hover:bg-gray-900 transition"
                    >
                      <Share2 className="w-6 h-6" />
                      <span className="text-xs">{currentVideo.shares}</span>
                    </button>
                  </div>

                  {/* Navigation */}
                  <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                    <button
                      onClick={goToPreviousVideo}
                      className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                      disabled={currentVideoIndex === 0}
                    >
                      ↑
                    </button>
                    <button
                      onClick={goToNextVideo}
                      className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                    >
                      ↓
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="absolute bottom-4 left-4 text-gray-400 text-sm">
              {currentVideoIndex + 1} / {videos.length}
            </div>
          </div>
        )}
      </div>

      {/* Comments Modal */}
      {currentVideo && (
        <CommentsModal
          videoId={currentVideo.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Share Modal */}
      {currentVideo && (
        <ShareModal
          videoTitle={currentVideo.title || "Video"}
          videoUrl={currentVideo.videoUrl || undefined}
          isOpen={showShare}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
