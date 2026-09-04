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
type PrivacySettingsState = { profilePublic: boolean; allowMessages: boolean; allowComments: boolean; showFollowers: boolean; showFollowing: boolean };
type SecuritySettingsState = { twoFactorEnabled: boolean; loginAlerts: boolean };
type NotificationSettingsState = { newFollowers: boolean; likes: boolean; comments: boolean; shares: boolean; messages: boolean; promotions: boolean };
type DisplaySettingsState = { language: string; darkMode: string; dataSaver: boolean; autoPlay: string; textSize: string; animations: boolean };

export default function Settings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: savedSettings, isLoading: settingsLoading } = trpc.user.getDisplaySettings.useQuery();

  const updateSettingsMutation = trpc.user.updateDisplaySettings.useMutation({
    onSuccess: async () => {
      await utils.user.getDisplaySettings.invalidate();
      toast.success("Paramètres enregistrés");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [isLoading, setIsLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsState>({ profilePublic: true, allowMessages: true, allowComments: true, showFollowers: true, showFollowing: true });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettingsState>({ twoFactorEnabled: false, loginAlerts: true });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsState>({ newFollowers: true, likes: true, comments: true, shares: true, messages: true, promotions: false });
  const [displaySettings, setDisplaySettings] = useState<DisplaySettingsState>({ language: "Français", darkMode: "Système", dataSaver: false, autoPlay: "Wi-Fi uniquement", textSize: "Normale", animations: true });

  useEffect(() => {
    if (!savedSettings) return;
    setDisplaySettings({ language: savedSettings.language, darkMode: savedSettings.darkMode, dataSaver: savedSettings.dataSaver, autoPlay: savedSettings.autoPlay, textSize: savedSettings.textSize, animations: savedSettings.animations });
    setPrivacySettings({ profilePublic: savedSettings.profilePublic, allowMessages: savedSettings.allowMessages, allowComments: savedSettings.allowComments, showFollowers: savedSettings.showFollowers, showFollowing: savedSettings.showFollowing });
    setSecuritySettings({ twoFactorEnabled: savedSettings.twoFactorEnabled, loginAlerts: savedSettings.loginAlerts });
    setNotificationSettings({ newFollowers: savedSettings.notifyFollowers, likes: savedSettings.notifyLikes, comments: savedSettings.notifyComments, shares: savedSettings.notifyShares, messages: savedSettings.notifyMessages, promotions: savedSettings.notifyPromotions });
    applyDisplayEffects(savedSettings);
  }, [savedSettings]);

  const applyDisplayEffects = (settings: DisplaySettingsState) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("afritok:darkMode", settings.darkMode);
    localStorage.setItem("afritok:language", settings.language);
    localStorage.setItem("afritok:dataSaver", String(settings.dataSaver));
    localStorage.setItem("afritok:autoPlay", settings.autoPlay);
    localStorage.setItem("afritok:textSize", settings.textSize);
    localStorage.setItem("afritok:animations", String(settings.animations));

    const dark = settings.darkMode === "Sombre" || (settings.darkMode === "Système" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.dataset.afritokTextSize = settings.textSize;
    document.documentElement.classList.toggle("reduce-motion", !settings.animations);
    window.dispatchEvent(new CustomEvent("afritok:settings-change", { detail: settings }));
    window.dispatchEvent(new CustomEvent("afritok:theme-change", { detail: settings.darkMode }));
  };

  const saveSettings = (overrides: Partial<DisplaySettingsState> & Partial<PrivacySettingsState> & Partial<SecuritySettingsState> & { notifyFollowers?: boolean; notifyLikes?: boolean; notifyComments?: boolean; notifyShares?: boolean; notifyMessages?: boolean; notifyPromotions?: boolean; }) => {
    updateSettingsMutation.mutate({
      ...displaySettings,
      ...privacySettings,
      ...securitySettings,
      notifyFollowers: notificationSettings.newFollowers,
      notifyLikes: notificationSettings.likes,
      notifyComments: notificationSettings.comments,
      notifyShares: notificationSettings.shares,
      notifyMessages: notificationSettings.messages,
      notifyPromotions: notificationSettings.promotions,
      ...overrides,
    });
  };

  const handlePrivacyChange = (key: keyof PrivacySettingsState) => {
    const newPrivacy = { ...privacySettings, [key]: !privacySettings[key] };
    setPrivacySettings(newPrivacy);
    saveSettings(newPrivacy);
  };

  const handleSecurityChange = (key: keyof SecuritySettingsState) => {
    const newSecurity = { ...securitySettings, [key]: !securitySettings[key] };
    setSecuritySettings(newSecurity);
    saveSettings(newSecurity);
  };

  const handleNotificationChange = (key: keyof NotificationSettingsState) => {
    const newNotifications = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(newNotifications);
    saveSettings({
      notifyFollowers: newNotifications.newFollowers,
      notifyLikes: newNotifications.likes,
      notifyComments: newNotifications.comments,
      notifyShares: newNotifications.shares,
      notifyMessages: newNotifications.messages,
      notifyPromotions: newNotifications.promotions,
    });
  };

  const updateDisplaySetting = (key: string, value: any) => {
    const newSettings = { ...displaySettings, [key]: value } as DisplaySettingsState;
    setDisplaySettings(newSettings);
    applyDisplayEffects(newSettings);
    saveSettings({ [key]: value });
  };

  const handleChangePassword = () => toast.info("Le changement de mot de passe n'est pas disponible avec la connexion OTP actuelle.");

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

  const handleDeleteAccount = () => toast.info("La suppression définitive du compte n'est pas encore implémentée côté serveur.");

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <SettingsHeader userId={user?.id} />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {settingsLoading && <div className="text-sm text-gray-500">Chargement de vos paramètres...</div>}
        <SettingsMenu activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={user?.role === "admin"} />
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === "privacy" && <PrivacySettings privacySettings={privacySettings} handlePrivacyChange={handlePrivacyChange} />}
          {activeTab === "security" && <SecuritySettings securitySettings={securitySettings} handleSecurityChange={handleSecurityChange} handleChangePassword={handleChangePassword} isLoading={isLoading || updateSettingsMutation.isPending} />}
          {activeTab === "notifications" && <NotificationSettings notificationSettings={notificationSettings} handleNotificationChange={handleNotificationChange} />}
          {activeTab === "account" && <><AccountSettings user={user} isLoading={isLoading} handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} /><WarningsSettings /><DisplaySettings settings={displaySettings} updateSetting={updateDisplaySetting} /><CacheSettings /><SupportSettings /><AboutSettings /></>}
          {activeTab === "admin" && user?.role === "admin" && <div className="p-6 bg-gray-900 rounded-lg border border-gray-800"><h2 className="text-xl font-bold mb-4">Administration</h2><p className="text-gray-400">Accès restreint aux administrateurs.</p></div>}
        </div>
      </div>
    </div>
  );
}
