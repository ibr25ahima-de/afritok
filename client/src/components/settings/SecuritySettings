import { Shield, Key } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SecuritySettingsProps {
  securitySettings: any;
  handleSecurityChange: (key: string) => void;
  handleChangePassword: () => void;
  isLoading: boolean;
}

export default function SecuritySettings({
  securitySettings,
  handleSecurityChange,
  handleChangePassword,
  isLoading,
}: SecuritySettingsProps) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Shield size={20} className="text-green-400" />
        Sécurité
      </h2>

      <div className="space-y-4">

        <div className="p-4 bg-black/50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Key size={18} className="text-blue-400" />
            <span className="font-semibold">
              Mot de passe
            </span>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={isLoading}
            className="w-full bg-gray-700 hover:bg-gray-600"
          >
            Modifier le mot de passe
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
          <span>Vérification en deux étapes</span>

          <button
            onClick={() =>
              handleSecurityChange("twoFactorEnabled")
            }
            className={`relative w-12 h-7 rounded-full ${
              securitySettings.twoFactorEnabled
                ? "bg-green-500"
                : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                securitySettings.twoFactorEnabled
                  ? "right-1"
                  : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-black/50 rounded-lg">
          <span>Alertes de sécurité</span>

          <button
            onClick={() =>
              handleSecurityChange("loginAlerts")
            }
            className={`relative w-12 h-7 rounded-full ${
              securitySettings.loginAlerts
                ? "bg-green-500"
                : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
                securitySettings.loginAlerts
                  ? "right-1"
                  : "left-1"
              }`}
            />
          </button>
        </div>

      </div>
    </Card>
  );
}
