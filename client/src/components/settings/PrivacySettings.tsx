import { Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSettingsText } from "@/hooks/useSettingsText";

interface PrivacySettingsProps {
  privacySettings: {
    profilePublic: boolean;
    allowMessages: boolean;
    allowComments: boolean;
    showFollowers: boolean;
    showFollowing: boolean;
  };
  handlePrivacyChange: (key: string) => void;
}

export default function PrivacySettings({ privacySettings, handlePrivacyChange }: PrivacySettingsProps) {
  const t = useSettingsText();

  const items = [
    { key: "allowComments", label: t("comments", "Commentaires") },
    { key: "allowMessages", label: t("directMessages", "Messages directs") },
    { key: "showFollowers", label: t("followersList", "Liste d'abonnés") },
    { key: "showFollowing", label: t("followingList", "Liste d'abonnements") },
  ] as const;

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Eye size={20} className="text-blue-400" />
        {t("privacy", "Confidentialité")}
      </h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            {t("discovery", "Découverte")}
          </h3>
          <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
            <div>
              <p className="font-semibold">{t("privateAccount", "Compte privé")}</p>
              <p className="text-sm text-gray-400">
                {t("privateDesc", "Seuls les abonnés approuvés peuvent voir votre contenu.")}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("privateAccount", "Compte privé")}
              aria-pressed={!privacySettings.profilePublic}
              onClick={() => handlePrivacyChange("profilePublic")}
              className={`relative w-12 h-7 rounded-full ${
                !privacySettings.profilePublic ? "bg-green-500" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                  !privacySettings.profilePublic ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            {t("interactions", "Interactions")}
          </h3>
          {items.map((setting) => {
            const enabled = Boolean(privacySettings[setting.key]);
            return (
              <div
                key={setting.key}
                className="flex items-center justify-between p-3 bg-black/50 rounded-lg mb-3"
              >
                <span className="font-medium">{setting.label}</span>
                <button
                  type="button"
                  aria-label={setting.label}
                  aria-pressed={enabled}
                  onClick={() => handlePrivacyChange(setting.key)}
                  className={`relative w-12 h-7 rounded-full ${
                    enabled ? "bg-green-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                      enabled ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
