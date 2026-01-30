import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, Video, Flame } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Trending() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const trendingVideosQuery = trpc.trending.videos.useQuery({ limit: 30 });
  const trendingHashtagsQuery = trpc.trending.hashtags.useQuery();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

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
              {APP_LOGO && (
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-8 w-8"
                />
              )}
              <span className="text-xl font-bold text-white">
                {APP_TITLE}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <Flame className="w-6 h-6" />
            <span className="font-semibold">Trending Now</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Trending Hashtags */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-400" />
            Trending Hashtags
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingHashtagsQuery.data?.map((hashtag, index) => (
              <div
                key={hashtag.tag}
                className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 hover:border-purple-600/50 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-orange-400 font-bold text-lg">
                      #{index + 1}
                    </p>
                    <p className="text-purple-400 font-semibold text-lg">
                      #{hashtag.tag}
                    </p>
                  </div>
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-purple-300">
                  {hashtag.count.toLocaleString()} videos
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Videos */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Video className="w-6 h-6 text-purple-400" />
            Most Liked Videos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingVideosQuery.data &&
            trendingVideosQuery.data.length > 0 ? (
              trendingVideosQuery.data.map((video) => (
                <div
                  key={video.id}
                  className="bg-purple-900/30 border border-purple-800/50 rounded-lg overflow-hidden hover:border-purple-600/50 transition cursor-pointer group"
                >
                  <div className="relative bg-black h-48 overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title || "Video"}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-purple-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                      <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-semibold">
                        Watch Now
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-2 line-clamp-2">
                      {video.title || "Untitled"}
                    </h3>
                    <div className="flex gap-4 text-sm text-purple-300">
                      <span>❤️ {video.likes || 0}</span>
                      <span>💬 {video.comments || 0}</span>
                      <span>👁️ {video.views || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-purple-300 col-span-full text-center py-12">
                No trending videos yet
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
        }
