import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Search as SearchIcon, Video, User } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useState } from "react";

export default function Search() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"videos" | "creators">("videos");

  const videosQuery = trpc.search.videos.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  );
  const creatorsQuery = trpc.search.creators.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  );

  const trendingQuery = trpc.trending.hashtags.useQuery();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
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

          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, creators, hashtags..."
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {searchQuery.length === 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Trending Hashtags</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingQuery.data?.map((hashtag) => (
                <div
                  key={hashtag.tag}
                  onClick={() => setSearchQuery(hashtag.tag)}
                  className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-4 hover:border-purple-600/50 transition cursor-pointer"
                >
                  <p className="text-purple-400 font-semibold">#{hashtag.tag}</p>
                  <p className="text-purple-300 text-sm">{hashtag.count.toLocaleString()} videos</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-purple-800/30">
              <button
                onClick={() => setActiveTab("videos")}
                className={`pb-2 font-semibold transition ${
                  activeTab === "videos"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-purple-300 hover:text-purple-200"
                }`}
              >
                <Video className="w-5 h-5 inline mr-2" />
                Videos
              </button>
              <button
                onClick={() => setActiveTab("creators")}
                className={`pb-2 font-semibold transition ${
                  activeTab === "creators"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-purple-300 hover:text-purple-200"
                }`}
              >
                <User className="w-5 h-5 inline mr-2" />
                Creators
              </button>
            </div>

            {/* Videos Tab */}
            {activeTab === "videos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videosQuery.data && videosQuery.data.length > 0 ? (
                  videosQuery.data.map((video) => (
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
                  ))
                ) : (
                  <p className="text-purple-300 col-span-full text-center py-8">
                    No videos found
                  </p>
                )}
              </div>
            )}

            {/* Creators Tab */}
            {activeTab === "creators" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creatorsQuery.data && creatorsQuery.data.length > 0 ? (
                  creatorsQuery.data.map((creator) => (
                    <div
                      key={creator.id}
                      onClick={() => navigate(`/profile/${creator.id}`)}
                      className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 hover:border-purple-600/50 transition cursor-pointer text-center"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-white font-semibold mb-1">{creator.name || "Creator"}</h3>
                      <p className="text-purple-300 text-sm mb-4">{creator.email}</p>
                      <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition">
                        View Profile
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-purple-300 col-span-full text-center py-8">
                    No creators found
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
