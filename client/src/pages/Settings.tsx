import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { ArrowLeft, Lock, Eye, EyeOff, Bell, Shield, LogOut, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Settings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  
  // ================= STATE =================
  const [activeTab, setActiveTab] = useState<'privacy' | 'security' | 'notifications' | 'account'>('privacy');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: true,
    allowMessages: true,
    allowComments: true,
    showFollowers: true,
    showFollowing: true,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30, // minutes
    loginAlerts: true,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    newFollowers: true,
    likes: true,
    comments: true,
    shares: true,
    messages: true,
    promotions: false,
  });

  // ================= HANDLERS =================
  const handlePrivacyChange = (key: string) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof privacySettings]
    }));
  };

  const handleSecurityChange = (key: string, value?: any) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key as keyof typeof securitySettings]
    }));
  };

  const handleNotificationChange = (key: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof notificationSettings]
    }));
  };

  const handleChangePassword = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement password change API
      toast.success('Mot de passe changé avec succès');
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    toast.success('Déconnecté avec succès');
  };

  const handleDeleteAccount = async () => {
    if (confirm('⚠️ Êtes-vous sûr ? Cette action est irréversible !')) {
      setIsLoading(true);
      try {
        // TODO: Implement account deletion API
        toast.success('Compte supprimé');
        await logout();
        navigate('/');
      } catch (error) {
        toast.error('Erreur lors de la suppression du compte');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // TODO: Save settings to backend
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/profile/' + user?.id)}
          className="text-white hover:text-gray-300 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Paramètres</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'privacy', label: 'Confidentialité', icon: Eye },
            { id: 'security', label: 'Sécurité', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'account', label: 'Compte', icon: Lock },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* PRIVACY SETTINGS */}
        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Eye size={20} className="text-blue-400" />
                Paramètres de confidentialité
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'profilePublic', label: 'Profil public', desc: 'Tout le monde peut voir votre profil' },
                  { key: 'allowMessages', label: 'Autoriser les messages', desc: 'Recevoir des messages privés' },
                  { key: 'allowComments', label: 'Autoriser les commentaires', desc: 'Les gens peuvent commenter vos vidéos' },
                  { key: 'showFollowers', label: 'Afficher les abonnés', desc: 'Tout le monde peut voir votre liste d\'abonnés' },
                  { key: 'showFollowing', label: 'Afficher les abonnements', desc: 'Tout le monde peut voir qui vous suivez' },
                ].map(setting => (
                  <div key={setting.key} className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                    <div>
                      <p className="font-semibold">{setting.label}</p>
                      <p className="text-sm text-gray-400">{setting.desc}</p>
                    </div>
                    <button
                      onClick={() => handlePrivacyChange(setting.key)}
                      className={`relative w-12 h-7 rounded-full transition ${
                        privacySettings[setting.key as keyof typeof privacySettings]
                          ? 'bg-green-500'
                          : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${
                          privacySettings[setting.key as keyof typeof privacySettings]
                            ? 'right-1'
                            : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* SECURITY SETTINGS */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield size={20} className="text-green-400" />
                Sécurité du compte
              </h2>

              <div className="space-y-4">
                {/* CHANGE PASSWORD */}
                <div className="p-4 bg-black/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Key size={18} className="text-blue-400" />
                      <div>
                        <p className="font-semibold">Changer le mot de passe</p>
                        <p className="text-sm text-gray-400">Mettez à jour votre mot de passe régulièrement</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Changer le mot de passe
                  </Button>
                </div>

                {/* TWO FACTOR */}
                <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                  <div>
                    <p className="font-semibold">Authentification à deux facteurs</p>
                    <p className="text-sm text-gray-400">Sécurité renforcée pour votre compte</p>
                  </div>
                  <button
                    onClick={() => handleSecurityChange('twoFactorEnabled')}
                    className={`relative w-12 h-7 rounded-full transition ${
                      securitySettings.twoFactorEnabled ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${
                        securitySettings.twoFactorEnabled ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* LOGIN ALERTS */}
                <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                  <div>
                    <p className="font-semibold">Alertes de connexion</p>
                    <p className="text-sm text-gray-400">Recevoir une alerte à chaque nouvelle connexion</p>
                  </div>
                  <button
                    onClick={() => handleSecurityChange('loginAlerts')}
                    className={`relative w-12 h-7 rounded-full transition ${
                      securitySettings.loginAlerts ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${
                        securitySettings.loginAlerts ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* NOTIFICATION SETTINGS */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bell size={20} className="text-yellow-400" />
                Notifications
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'newFollowers', label: 'Nouveaux abonnés', desc: 'Quand quelqu\'un vous suit' },
                  { key: 'likes', label: 'Likes', desc: 'Quand quelqu\'un aime votre vidéo' },
                  { key: 'comments', label: 'Commentaires', desc: 'Quand quelqu\'un commente votre vidéo' },
                  { key: 'shares', label: 'Partages', desc: 'Quand quelqu\'un partage votre vidéo' },
                  { key: 'messages', label: 'Messages', desc: 'Nouveaux messages privés' },
                  { key: 'promotions', label: 'Promotions', desc: 'Offres spéciales et mises à jour' },
                ].map(setting => (
                  <div key={setting.key} className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
                    <div>
                      <p className="font-semibold">{setting.label}</p>
                      <p className="text-sm text-gray-400">{setting.desc}</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange(setting.key)}
                      className={`relative w-12 h-7 rounded-full transition ${
                        notificationSettings[setting.key as keyof typeof notificationSettings]
                          ? 'bg-green-500'
                          : 'bg-gray-700'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${
                          notificationSettings[setting.key as keyof typeof notificationSettings]
                            ? 'right-1'
                            : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ACCOUNT SETTINGS */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            {/* ACCOUNT INFO */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4">Informations du compte</h2>
              <div className="space-y-3">
                <div className="p-3 bg-black/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Nom d'utilisateur</p>
                  <p className="font-semibold">{user?.name || 'Non défini'}</p>
                </div>
                <div className="p-3 bg-black/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="font-semibold">{user?.email || 'Non défini'}</p>
                </div>
              </div>
            </Card>

            {/* LOGOUT */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <LogOut size={20} className="text-orange-400" />
                Déconnexion
              </h2>
              <Button
                onClick={handleLogout}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Se déconnecter
              </Button>
            </Card>

            {/* DELETE ACCOUNT */}
            <Card className="bg-red-950 border-red-800 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
                <Trash2 size={20} />
                Zone de danger
              </h2>
              <p className="text-sm text-red-300 mb-4">
                ⚠️ La suppression de votre compte est irréversible. Toutes vos données seront supprimées.
              </p>
              <Button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Supprimer mon compte
              </Button>
            </Card>
          </div>
        )}

        {/* SAVE BUTTON */}
        {activeTab !== 'account' && (
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </Button>
            <Button
              onClick={() => navigate('/profile/' + user?.id)}
              variant="outline"
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
