import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
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
import WarningsSettings from "@/components/settings/WarningsSettings";

type Tab = "account" | "privacy" | "security" | "notifications" | "admin";

type PrivacySettingsState = {
  profilePublic: boolean;
  allowMessages: boolean;
  allowComments: boolean;
  showFollowers: boolean;
  showFollowing: boolean;
};

export default function Settings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: savedSettings } = trpc.user.getDisplaySettings.useQuery();

  const updateSettingsMutation = trpc.user.updateDisplaySettings.useMutation({
    onSuccess: () => toast.success("Paramètres enregistrés"),
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [isLoading, setIsLoading] = useState(false);

  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsState>({
    profilePublic: true,
    allowMessages: true,
    allowComments: true,
    showFollowers: true,
    showFollowing: true,
  });

  const [securitySettings, setSecuritySettings] = useState({ twoFactorEnabled: false, loginAlerts: true });
  const [notificationSettings, setNotificationSettings] = useState({ newFollowers: true, likes: true, comments: true, shares: true, messages: true, promotions: false });
  const [displaySettings, setDisplaySettings] = useState({ language: "Français", darkMode: "Système", dataSaver: false, autoPlay: "Wi-Fi uniquement", textSize: "Normale", animations: true });

  useEffect(() => {
    if (!savedSettings) return;
    setDisplaySettings({
      language: savedSettings.language,
      darkMode: savedSettings.darkMode,
      dataSaver: savedSettings.dataSaver,
      autoPlay: savedSettings.autoPlay,
      textSize: savedSettings.textSize,
      animations: savedSettings.animations,
    });
    setPrivacySettings({
      profilePublic: savedSettings.profilePublic,
      allowMessages: savedSettings.allowMessages,
      allowComments: savedSettings.allowComments,
      showFollowers: savedSettings.showFollowers,
      showFollowing: savedSettings.showFollowing,
    });
  }, [savedSettings]);

  const handlePrivacyChange = (key: keyof PrivacySettingsState) => {
    const newPrivacy = { ...privacySettings, [key]: !privacySettings[key] };
    setPrivacySettings(newPrivacy);
    updateSettingsMutation.mutate({ ...displaySettings, ...newPrivacy });
  };

  const handleSecurityChange = (key: string) => setSecuritySettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof securitySettings] }));
  const handleNotificationChange = (key: string) => setNotificationSettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof notificationSettings] }));

  const updateDisplaySetting = (key: string, value: any) => {
    const newSettings = { ...displaySettings, [key]: value };
    setDisplaySettings(newSettings);
    updateSettingsMutation.mutate({ ...newSettings, ...privacySettings });
  };

  const handleChangePassword = () => toast.info("Changement de mot de passe à venir");

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      toast.success("Déconnecté avec succès");
      navigate("/login");
    } catch {
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("⚠️ Êtes-vous sûr ? Cette action est irréversible !")) toast.error("Fonctionnalité de suppression à venir");
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <SettingsHeader userId={user?.id} />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <SettingsMenu activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={user?.role === "admin"} />
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === "privacy" && <PrivacySettings privacySettings={privacySettings} handlePrivacyChange={handlePrivacyChange} />}
          {activeTab === "security" && <SecuritySettings securitySettings={securitySettings} handleSecurityChange={handleSecurityChange} handleChangePassword={handleChangePassword} isLoading={isLoading} />}
          {activeTab === "notifications" && <NotificationSettings notificationSettings={notificationSettings} handleNotificationChange={handleNotificationChange} />}
          {activeTab === "account" && <>
            <AccountSettings user={user} isLoading={isLoading} handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} />
            <WarningsSettings />
            <DisplaySettings settings={displaySettings} updateSetting={updateDisplaySetting} />
            <CacheSettings />
            <SupportSettings />
            <AboutSettings />
          </>}
          {activeTab === "admin" && user?.role === "admin" && <div className="p-6 bg-gray-900 rounded-lg border border-gray-800"><h2 className="text-xl font-bold mb-4">Administration</h2><p className="text-gray-400">Accès restreint aux administrateurs.</p></div>}
        </div>
      </div>
    </div>
  );
}
