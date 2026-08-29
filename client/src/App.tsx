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
import Wallet from "./pages/Wallet";
import Coins from "./pages/Coins";
import Gifts from "./pages/Gifts";
import Discover from "./pages/Discover";
import Inbox from "./pages/Inbox";
import AudioDetail from "./pages/AudioDetail";
import Advertising from "./pages/Advertising";
import AfritokPremium from "./pages/AfritokPremium";
import AdvertisingButton from "./components/AdvertisingButton";
import PremiumButton from "./components/PremiumButton";
import GlobalAdSlot from "./components/advertising/GlobalAdSlot";
import ProfileMessageLauncher from "./components/ProfileMessageLauncher";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

function AdminRoute({ component: Component, ...rest }: any) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role !== "admin") return <Redirect to="/feed" />;
  return <Component {...rest} />;
}

function Router() {
  const { loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-black text-white"><Loader2 className="animate-spin w-12 h-12" /></div>;
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/feed" component={Feed} />
      <Route path="/discover" component={Discover} />
      <Route path="/upload/:videoId?" component={Upload} />
      <Route path="/publish" component={Publish} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/profile" component={Profile} />
      <Route path="/gifts" component={Gifts} />
      <Route path="/audio/:videoId" component={AudioDetail} />
      <Route path="/advertising" component={Advertising} />
      <Route path="/premium" component={AfritokPremium} />
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
      <Route path="/wallet" component={Wallet} />
      <Route path="/coins" component={Coins} />
      <Route path="/qr-code" component={QRCode} />
      <Route path="/admin/users/:userId">{(params) => <AdminRoute component={UserDetails} {...params} />}</Route>
      <Route path="/admin/music">{(params) => <AdminRoute component={AdminMusic} {...params} />}</Route>
      <Route path="/admin/finance">{(params) => <AdminRoute component={PlatformFinance} {...params} />}</Route>
      <Route path="/admin">{(params) => <AdminRoute component={AdminDashboard} {...params} />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalAdvertisingButton() {
  const [location] = useLocation();
  if (location === "/advertising" || location.startsWith("/admin")) return null;
  return <div className="fixed bottom-24 right-4 z-[90]"><AdvertisingButton /></div>;
}

function GlobalPremiumButton() {
  const [location] = useLocation();
  if (!location.startsWith("/profile") || location.startsWith("/admin")) return null;
  return <div className="fixed bottom-24 left-4 z-[90]"><PremiumButton /></div>;
}

function GlobalAdvertisingDisplay() {
  const [location] = useLocation();
  if (location === "/advertising" || location.startsWith("/admin")) return null;
  return <GlobalAdSlot />;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><NotificationProvider><TooltipProvider><Toaster /><Router /><ProfileMessageLauncher /><GlobalAdvertisingButton /><GlobalPremiumButton /><GlobalAdvertisingDisplay /></TooltipProvider></NotificationProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
