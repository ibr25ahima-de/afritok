import { Eye, Shield, Bell, Lock, Settings as SettingsIcon } from "lucide-react";
import { useSettingsText } from "@/hooks/useSettingsText";

type Tab = "privacy" | "security" | "notifications" | "account" | "admin";
interface SettingsMenuProps { activeTab: Tab; setActiveTab: (tab: Tab) => void; isAdmin?: boolean; }

export default function SettingsMenu({ activeTab, setActiveTab, isAdmin }: SettingsMenuProps) {
  const t = useSettingsText();
  const tabs = [
    { id:"account", label:t("account","Compte"), icon:Lock },
    { id:"privacy", label:t("privacy","Confidentialité"), icon:Eye },
    { id:"security", label:t("security","Sécurité"), icon:Shield },
    { id:"notifications", label:t("notifications","Notifications"), icon:Bell },
  ];
  if (isAdmin) tabs.push({ id:"admin", label:t("admin","Administration"), icon:SettingsIcon });
  return <div className="flex gap-2 mb-6 overflow-x-auto pb-2">{tabs.map(tab=>{const Icon=tab.icon;return <button key={tab.id} onClick={()=>setActiveTab(tab.id as Tab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${activeTab===tab.id?"bg-red-500 text-white":"bg-gray-900 text-gray-400 hover:bg-gray-800"}`}><Icon size={18}/>{tab.label}</button>;})}</div>;
}
