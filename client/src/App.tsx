import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Monetization from "./pages/Monetization";
import AdminDashboard from "./pages/AdminDashboard";
import Upload from "./pages/Upload";
import Search from "./pages/Search";
import Trending from "./pages/Trending";
import EditProfile from "./pages/EditProfile";
import MyVideos from "./pages/MyVideos";
import Notifications from "./pages/Notifications";
import Login from "./pages/Login";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Router Component
 * Handles all application routes and authentication checks
 */
function Router() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin w-12 h-12 text-purple-500 mx-auto" />
          <p className="text-purple-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />

      {/* Protected routes - Feed and main features */}
      <Route path={"/feed"} component={Feed} />
      <Route path={"/profile/:userId"} component={Profile} />
      <Route path={"/monetization"} component={Monetization} />
      <Route path={"/upload"} component={Upload} />
      <Route path={"/search"} component={Search} />
      <Route path={"/trending"} component={Trending} />
      <Route path={"/edit-profile"} component={EditProfile} />
      <Route path={"/my-videos"} component={MyVideos} />
      <Route path={"/notifications"} component={Notifications} />

      {/* Admin routes - only accessible to admin users */}
      {user?.role === "admin" && <Route path={"/admin"} component={AdminDashboard} />}

      {/* Error pages */}
      <Route path={"/404"} component={NotFound} />

      {/* Fallback - catch all undefined routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Main App Component
 * Sets up providers and global configuration
 */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
