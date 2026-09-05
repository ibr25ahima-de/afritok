import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSettingsText } from "@/hooks/useSettingsText";

type NotificationSettingsKey = "newFollowers" | "likes" | "comments" | "shares" | "messages" | "promotions";

interface NotificationSettingsProps {
  notificationSettings: Record<NotificationSettingsKey, boolean>;
  handleNotificationChange: (key: NotificationSettingsKey) => void;
}

export default function NotificationSettings({ notificationSettings, handleNotificationChange }: NotificationSettingsProps) {
  const t = useSettingsText();
  const items: Array<{ key: NotificationSettingsKey; label: string }> = [
    { key: "newFollowers", label: t("followersList", "Abonnés") },
    { key: "likes", label: t("likes", "Mentions J'aime") },
    { key: "comments", label: t("comments", "Commentaires") },
    { key: "shares", label: t("shares", "Partages") },
    { key: "messages", label: t("directMessages", "Messages directs") },
    { key: "promotions", label: t("suggestions", "Suggestions") },
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Bell size={20} className="text-yellow-400" />
        {t("notifications", "Notifications")}
      </h2>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
            <span>{item.label}</span>
            <button
              aria-pressed={!!notificationSettings[item.key]}
              onClick={() => handleNotificationChange(item.key)}
              className={`relative w-12 h-7 rounded-full ${notificationSettings[item.key] ? "bg-green-500" : "bg-gray-700"}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full ${notificationSettings[item.key] ? "right-1" : "left-1"}`} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
