import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Music, Users, TrendingUp, Zap, ArrowRight } from "lucide-react";

/**
 * Home Page Component
 * Landing page for unauthenticated users
 * Shows features and calls-to-action to login or get started
 */
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to feed
  if (isAuthenticated) {
    navigate("/feed");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Bar */}
      <nav className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2">
            {APP_LOGO && (
              <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 rounded-full" />
            )}
            <span className="text-xl font-bold text-white">{APP_TITLE}</span>
          </div>

          {/* Sign In Button */}
          <button
            onClick={() => navigate("/login")}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            {/* Headline */}
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Create. Share. Earn.
              </h1>
              <p className="text-xl text-purple-200">
                Afritok is the platform for African creators to share their stories, build communities, and earn money directly from their content.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => navigate("/login")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                className="border-purple-400 text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 px-8 py-6 text-lg font-semibold rounded-lg transition-colors"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Right Column - Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Feature 1: Create Videos */}
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/20 border border-purple-800/30 rounded-lg p-6 hover:border-purple-700/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
              <Music className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Create Videos</h3>
              <p className="text-sm text-purple-200">
                Share your creativity with the world
              </p>
            </div>

            {/* Feature 2: Build Community */}
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/20 border border-purple-800/30 rounded-lg p-6 hover:border-purple-700/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
              <Users className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Build Community</h3>
              <p className="text-sm text-purple-200">
                Connect with your audience
              </p>
            </div>

            {/* Feature 3: Trending */}
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/20 border border-purple-800/30 rounded-lg p-6 hover:border-purple-700/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
              <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Go Viral</h3>
              <p className="text-sm text-purple-200">
                Reach millions of viewers
              </p>
            </div>

            {/* Feature 4: Monetization */}
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/20 border border-purple-800/30 rounded-lg p-6 hover:border-purple-700/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
              <Zap className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Earn Money</h3>
              <p className="text-sm text-purple-200">
                Get paid for your content
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-slate-900/50 border-y border-purple-800/30 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">100K+</div>
              <p className="text-purple-200">Active Creators</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">10M+</div>
              <p className="text-purple-200">Monthly Views</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">$5M+</div>
              <p className="text-purple-200">Paid Out</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">50+</div>
              <p className="text-purple-200">Countries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">
          Why Choose Afritok?
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 border border-purple-800/30 rounded-lg p-8 hover:border-purple-700/50 transition-all">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <Music className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Easy to Use</h3>
            <p className="text-purple-200">
              Simple, intuitive interface designed for creators of all levels. Start creating in seconds.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 border border-purple-800/30 rounded-lg p-8 hover:border-purple-700/50 transition-all">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">African Focus</h3>
            <p className="text-purple-200">
              Built for African creators, by African creators. Celebrate African culture and creativity.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 border border-purple-800/30 rounded-lg p-8 hover:border-purple-700/50 transition-all">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Fair Monetization</h3>
            <p className="text-purple-200">
              Keep more of your earnings. Transparent pricing and instant payouts in local currencies.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-900/50 to-slate-900/50 border-y border-purple-800/30 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-purple-200">
            Join thousands of African creators earning on Afritok today
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/50 inline-flex items-center gap-2"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-purple-800/30 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><a href="#" className="hover:text-purple-200">Features</a></li>
                <li><a href="#" className="hover:text-purple-200">Pricing</a></li>
                <li><a href="#" className="hover:text-purple-200">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><a href="#" className="hover:text-purple-200">About</a></li>
                <li><a href="#" className="hover:text-purple-200">Blog</a></li>
                <li><a href="#" className="hover:text-purple-200">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><a href="#" className="hover:text-purple-200">Terms</a></li>
                <li><a href="#" className="hover:text-purple-200">Privacy</a></li>
                <li><a href="#" className="hover:text-purple-200">Cookies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Follow</h4>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><a href="#" className="hover:text-purple-200">Twitter</a></li>
                <li><a href="#" className="hover:text-purple-200">Instagram</a></li>
                <li><a href="#" className="hover:text-purple-200">TikTok</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-purple-800/30 pt-8 text-center text-purple-300 text-sm">
            <p>&copy; 2026 {APP_TITLE}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Background Decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
