import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";

interface NotificationSettingsProps {
  notificationSettings: any;
  handleNotificationChange: (key: string) => void;
}

export default function NotificationSettings({
  notificationSettings,
  handleNotificationChange,
}: NotificationSettingsProps) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Bell size={20} className="text-yellow-400" />
        Notifications
      </h2>

      <div className="space-y-3">
        {[
          { key: "newFollowers", label: "Abonnés" },
          { key: "likes", label: "Mentions J'aime" },
          { key: "comments", label: "Commentaires" },
          { key: "shares", label: "Partages" },
          { key: "messages", label: "Messages directs" },
          { key: "promotions", label: "Suggestions" },
        ].map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-3 bg-black/50 rounded-lg"
          >
            <span>{item.label}</span>

            <button
              onClick={() => handleNotificationChange(item.key)}
              className={`relative w-12 h-7 rounded-full ${
                notificationSettings[item.key]
                  ? "bg-green-500"
                  : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                  notificationSettings[item.key]
                    ? "right-1"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
