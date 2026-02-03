import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Music, Users, TrendingUp, Zap } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (isAuthenticated) {
    navigate("/feed");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <span className="text-xl font-bold text-white">{APP_TITLE}</span>
          </div>
          <a href="/" className="text-purple-400 hover:text-purple-300">
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                Create. Share. Earn.
              </h1>
              <p className="text-xl text-purple-200">
                Afritok is the platform for African creators to share their stories, build communities, and earn money directly from their content.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => window.location.href = "/"}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                className="border-purple-400 text-purple-400 hover:bg-purple-900/20 px-8 py-6 text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 hover:border-purple-600/50 transition">
              <Music className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Create Videos</h3>
              <p className="text-sm text-purple-200">Share your creativity with the world</p>
            </div>

            <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 hover:border-purple-600/50 transition">
              <Users className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Build Community</h3>
              <p className="text-sm text-purple-200">Connect with your audience</p>
            </div>

            <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 hover:border-purple-600/50 transition">
              <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Grow Your Reach</h3>
              <p className="text-sm text-purple-200">Reach millions of viewers</p>
            </div>

            <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 hover:border-purple-600/50 transition">
              <Zap className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Earn Money</h3>
              <p className="text-sm text-purple-200">Get paid in your local currency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-purple-800/30 bg-slate-900/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-purple-300 text-sm">
          <p>&copy; 2025 Afritok. Empowering African creators worldwide.</p>
        </div>
      </div>
    </div>
  );
}
