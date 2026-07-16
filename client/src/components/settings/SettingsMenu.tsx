import {
  Eye,
  Shield,
  Bell,
  Lock,
  Settings as SettingsIcon,
} from "lucide-react";

type Tab =
  | "privacy"
  | "security"
  | "notifications"
  | "account"
  | "admin";

interface SettingsMenuProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isAdmin?: boolean;
}

export default function SettingsMenu({
  activeTab,
  setActiveTab,
  isAdmin,
}: SettingsMenuProps) {
  const tabs = [
    { id: "account", label: "Compte", icon: Lock },
    { id: "privacy", label: "Confidentialité", icon: Eye },
    { id: "security", label: "Sécurité", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  if (isAdmin) {
    tabs.push({
      id: "admin",
      label: "Administration",
      icon: SettingsIcon,
    });
  }

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              activeTab === tab.id
                ? "bg-red-500 text-white"
                : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
          >
            <Icon size={18} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
