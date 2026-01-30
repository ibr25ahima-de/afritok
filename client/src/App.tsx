import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { Loader2 } from "lucide-react";

import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

import Home from "@/pages/Home";
import Feed from "@/pages/Feed";
import Profile from "@/pages/Profile";
import Monetization from "@/pages/Monetization";
import AdminDashboard from "@/pages/AdminDashboard";
import Upload from "@/pages/Upload";
import Search from "@/pages/Search";
import Trending from "@/pages/Trending";
import EditProfile from "@/pages/EditProfile";
import MyVideos from "@/pages/MyVideos";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/NotFound";

import { useAuth } from "@/_core/hooks/useAuth"; // ✅ CHEMIN DÉFINITIF

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/feed" component={Feed} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/monetization" component={Monetization} />
      <Route path="/upload" component={Upload} />
      <Route path="/search" component={Search} />
      <Route path="/trending" component={Trending} />
      <Route path="/edit-profile" component={EditProfile} />
      <Route path="/my-videos" component={MyVideos} />
      <Route path="/notifications" component={Notifications} />

      {user?.role === "admin" && (
        <Route path="/admin" component={AdminDashboard} />
      )}

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
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
