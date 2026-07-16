import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Components
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsMenu from "@/components/settings/SettingsMenu";
import AccountSettings from "@/components/settings/AccountSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import DisplaySettings from "@/components/settings/DisplaySettings";
import CacheSettings from "@/components/settings/CacheSettings";
import SupportSettings from "@/components/settings/SupportSettings";
import AboutSettings from "@/components/settings/AboutSettings";

type Tab = "account" | "privacy" | "security" | "notifications" | "admin";

export default function Settings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  // ================= STATE =================
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [isLoading, setIsLoading] = useState(false);

  // Note: These will be connected to the backend in the next steps
  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: true,
    allowMessages: true,
    allowComments: true,
    showFollowers: true,
    showFollowing: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newFollowers: true,
    likes: true,
    comments: true,
    shares: true,
    messages: true,
    promotions: false,
  });

  const [displaySettings, setDisplaySettings] = useState({
    language: "Français",
    darkMode: "Système",
    dataSaver: false,
    autoPlay: "Wi-Fi uniquement",
    textSize: "Normale",
    animations: true,
  });

  // ================= HANDLERS =================
  const handlePrivacyChange = (key: string) => {
    setPrivacySettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof privacySettings],
    }));
  };

  const handleSecurityChange = (key: string) => {
    setSecuritySettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof securitySettings],
    }));
  };

  const handleNotificationChange = (key: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof notificationSettings],
    }));
  };

  const updateDisplaySetting = (key: string, value: any) => {
    setDisplaySettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleChangePassword = () => {
    toast.info("Changement de mot de passe à venir");
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      toast.success("Déconnecté avec succès");
      navigate("/login");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("⚠️ Êtes-vous sûr ? Cette action est irréversible !")) {
      toast.error("Fonctionnalité de suppression à venir");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header fixe */}
      <SettingsHeader userId={user?.id} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Menu de navigation par onglets */}
        <SettingsMenu
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={user?.role === "admin"}
        />

        {/* Contenu dynamique selon l'onglet actif */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {activeTab === "privacy" && (
            <PrivacySettings
              privacySettings={privacySettings}
              handlePrivacyChange={handlePrivacyChange}
            />
          )}

          {activeTab === "security" && (
            <SecuritySettings
              securitySettings={securitySettings}
              handleSecurityChange={handleSecurityChange}
              handleChangePassword={handleChangePassword}
              isLoading={isLoading}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationSettings
              notificationSettings={notificationSettings}
              handleNotificationChange={handleNotificationChange}
            />
          )}

          {activeTab === "account" && (
            <>
              <AccountSettings
                user={user}
                isLoading={isLoading}
                handleLogout={handleLogout}
                handleDeleteAccount={handleDeleteAccount}
              />

              <DisplaySettings
                settings={displaySettings}
                updateSetting={updateDisplaySetting}
              />

              <CacheSettings />

              <SupportSettings />

              <AboutSettings />
            </>
          )}

          {activeTab === "admin" && user?.role === "admin" && (
            <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Administration</h2>
              <p className="text-gray-400">Accès restreint aux administrateurs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
