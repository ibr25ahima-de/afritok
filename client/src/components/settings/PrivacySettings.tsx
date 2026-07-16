import { Eye } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PrivacySettingsProps {
  privacySettings: any;
  handlePrivacyChange: (key: string) => void;
}

export default function PrivacySettings({
  privacySettings,
  handlePrivacyChange,
}: PrivacySettingsProps) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Eye size={20} className="text-blue-400" />
        Confidentialité
      </h2>

      <div className="space-y-6">

        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            Découverte
          </h3>

          <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
            <div>
              <p className="font-semibold">Compte privé</p>
              <p className="text-sm text-gray-400">
                Seuls les abonnés approuvés peuvent voir votre contenu.
              </p>
            </div>

            <button
              onClick={() => handlePrivacyChange("profilePublic")}
              className={`relative w-12 h-7 rounded-full ${
                !privacySettings.profilePublic
                  ? "bg-green-500"
                  : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                  !privacySettings.profilePublic
                    ? "right-1"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            Interactions
          </h3>

          {[
            { key: "allowComments", label: "Commentaires" },
            { key: "allowMessages", label: "Messages directs" },
            { key: "showFollowers", label: "Liste d'abonnés" },
            { key: "showFollowing", label: "Liste d'abonnements" },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between p-3 bg-black/50 rounded-lg mb-3"
            >
              <span className="font-medium">{setting.label}</span>

              <button
                onClick={() => handlePrivacyChange(setting.key)}
                className={`relative w-12 h-7 rounded-full ${
                  privacySettings[setting.key]
                    ? "bg-green-500"
                    : "bg-gray-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                    privacySettings[setting.key]
                      ? "right-1"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

      </div>
    </Card>
  );
}
