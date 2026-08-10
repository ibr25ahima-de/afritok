import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Monetization from "./pages/Monetization";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMusic from "./pages/AdminMusic";
import UserDetails from "./pages/admin/UserDetails";
import PlatformFinance from "./pages/admin/PlatformFinance";
import Upload from "./pages/Upload";
import Publish from "./pages/Publish";
import Search from "./pages/Search";
import Trending from "./pages/Trending";
import EditProfile from "./pages/EditProfile";
import MyVideos from "./pages/MyVideos";
import Notifications from "./pages/Notifications";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import InstantWithdraw from "./pages/InstantWithdraw";
import AfritokStudio from "./pages/AfritokStudio";
import Balance from "./pages/Balance";
import QRCode from "./pages/QRCode";

/* ✅ NEW TikTok navigation pages */
import Discover from "./pages/Discover";
import Inbox from "./pages/Inbox";
import AudioDetail from "./pages/AudioDetail"; // 👈 AJOUTÉ

import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Composant pour protéger les routes admin
function AdminRoute({ component: Component, ...rest }: any) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user?.role !== "admin") return <Redirect to="/feed" />;

  return <Component {...rest} />;
}

function Router() {
  const { loading } = useAuth();

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
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />

      {/* TikTok main */}
      <Route path="/feed" component={Feed} />
      <Route path="/discover" component={Discover} />
      <Route path="/upload/:videoId?" component={Upload} />
      <Route path="/publish" component={Publish} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/profile" component={Profile} />
      <Route path="/audio/:videoId" component={AudioDetail} /> {/* 👈 AJOUTÉ ICI */}
      
      {/* Features */}
      <Route path="/monetization" component={Monetization} />
      <Route path="/search" component={Search} />
      <Route path="/trending" component={Trending} />
      <Route path="/edit-profile" component={EditProfile} />
      <Route path="/my-videos" component={MyVideos} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route path="/instant-withdraw" component={InstantWithdraw} />
      <Route path="/afritok-studio" component={AfritokStudio} />
      <Route path="/balance" component={Balance} />
      <Route path="/qr-code" component={QRCode} />

      {/* Admin Routes - Déclarées explicitement avec protection */}
      <Route path="/admin/users/:userId">
        {(params) => <AdminRoute component={UserDetails} {...params} />}
      </Route>

      <Route path="/admin/music">
        {(params) => <AdminRoute component={AdminMusic} {...params} />}
      </Route>

      <Route path="/admin/finance">
        {(params) => <AdminRoute component={PlatformFinance} {...params} />}
      </Route>

      <Route path="/admin">
        {(params) => <AdminRoute component={AdminDashboard} {...params} />}
      </Route>

      {/* Errors */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

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
