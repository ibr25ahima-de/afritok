import { useAuth } from "@/_core/hooks/useAuth";
import { useNavigate } from "wouter";
import { ArrowLeft, Bell, Lock, Eye, Trash2, LogOut, Shield, User } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"privacy" | "security" | "notifications" | "account">("privacy");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    // TODO: Implement account deletion via tRPC
    console.log("Account deletion requested");
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate("/profile")}
            className="p-2 hover:bg-gray-900 rounded-full transition"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Paramètres</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-800">
        {[
          { id: "privacy", label: "Confidentialité", icon: Eye },
          { id: "security", label: "Sécurité", icon: Lock },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "account", label: "Compte", icon: User },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition ${
              activeTab === id
                ? "bg-red-600 text-white"
                : "bg-gray-900 text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Icon size={18} />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="p-4 space-y-4">
        {/* PRIVACY TAB */}
        {activeTab === "privacy" && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Compte privé</h3>
                  <p className="text-sm text-gray-400">Seuls tes abonnés peuvent voir tes vidéos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privateAccount}
                    onChange={(e) => setPrivateAccount(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Permettre les commentaires</h3>
                  <p className="text-sm text-gray-400">Les utilisateurs peuvent commenter tes vidéos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-red-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Permettre les partages</h3>
                  <p className="text-sm text-gray-400">Les utilisateurs peuvent partager tes vidéos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-red-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Shield size={18} className="text-green-500" />
                    Authentification à deux facteurs
                  </h3>
                  <p className="text-sm text-gray-400">Sécurise ton compte avec 2FA</p>
                </div>
                <Button variant="outline" size="sm">
                  Activer
                </Button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Appareils connectés</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div>
                    <p className="text-sm">Chrome - Windows</p>
                    <p className="text-xs text-gray-400">Dernier accès: il y a 2 heures</p>
                  </div>
                  <button className="text-red-500 hover:text-red-400 text-sm">Déconnecter</button>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Historique de connexion</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>📍 Dakar, Sénégal - 15 mars 2026, 02:30</p>
                <p>📍 Dakar, Sénégal - 14 mars 2026, 18:45</p>
                <p>📍 Dakar, Sénégal - 13 mars 2026, 10:20</p>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Tous les notifications</h3>
                  <p className="text-sm text-gray-400">Reçois toutes les notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-red-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>

            {notificationsEnabled && (
              <>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Nouveaux abonnés</h3>
                      <p className="text-sm text-gray-400">Notifié quand quelqu'un t'abonne</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-red-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Likes et commentaires</h3>
                      <p className="text-sm text-gray-400">Notifié sur les likes et commentaires</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-red-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Mises à jour de paiement</h3>
                      <p className="text-sm text-gray-400">Notifié sur tes revenus et retraits</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-red-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === "account" && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Informations du compte</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Nom d'utilisateur</span>
                  <span>{user?.name || "Non défini"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span>{user?.email || "Non défini"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Compte créé</span>
                  <span>2 mars 2026</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Se déconnecter
              </Button>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="w-full flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Supprimer le compte
              </Button>
            </div>

            {showDeleteConfirm && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                <h3 className="font-semibold text-red-500 mb-2">⚠️ Attention</h3>
                <p className="text-sm text-gray-300 mb-4">
                  La suppression de ton compte est définitive. Toutes tes données seront perdues.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    variant="destructive"
                    className="flex-1"
                  >
                    Confirmer la suppression
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
