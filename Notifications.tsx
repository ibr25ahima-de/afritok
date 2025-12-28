import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Heart, MessageCircle, Users, Bell } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const notificationsQuery = trpc.notification.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "follow":
        return <Users className="w-5 h-5 text-purple-500" />;
      case "share":
        return <Bell className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-purple-500" />;
    }
  };

  const getNotificationMessage = (notification: any) => {
    switch (notification.type) {
      case "like":
        return `Someone liked your video`;
      case "comment":
        return `Someone commented on your video`;
      case "follow":
        return `Someone started following you`;
      case "share":
        return `Someone shared your video`;
      default:
        return notification.message || "New notification";
    }
  };

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
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <span className="text-xl font-bold text-white">{APP_TITLE}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
          <Bell className="w-8 h-8" />
          Notifications
        </h1>

        {notificationsQuery.data && notificationsQuery.data.length > 0 ? (
          <div className="space-y-3">
            {notificationsQuery.data.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition cursor-pointer ${
                  notification.isRead
                    ? "bg-slate-800/30 border-purple-800/30"
                    : "bg-purple-900/40 border-purple-700/50 hover:bg-purple-900/60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {getNotificationMessage(notification)}
                    </p>
                    {notification.message && (
                      <p className="text-purple-300 text-sm mt-1">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-purple-400 text-xs mt-2">
                      {new Date(notification.createdAt).toLocaleDateString()} at{" "}
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
            <p className="text-purple-300 text-lg">No notifications yet</p>
            <p className="text-purple-400 text-sm mt-2">
              When someone likes, comments, or follows you, you'll see it here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
