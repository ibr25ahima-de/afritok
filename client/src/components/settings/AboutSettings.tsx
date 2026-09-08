import { Info, RefreshCw, FileCode, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useSettingsText } from "@/hooks/useSettingsText";

export default function AboutSettings() {
  const t = useSettingsText();

  const items = [
    {
      icon: <RefreshCw size={18} />,
      label: t("updates", "Vérifier les mises à jour"),
      action: () =>
        toast.info(
          t(
            "updatesInfo",
            "Votre application utilise actuellement la version 1.0.0. Les mises à jour seront proposées directement dans l'application."
          )
        ),
    },
    {
      icon: <FileCode size={18} />,
      label: t("license", "Licence Open Source"),
      action: () =>
        toast.info(
          t(
            "licenseInfo",
            "Les informations de licence sont intégrées à AfriTok. Aucun accès au dépôt de développement n'est nécessaire."
          )
        ),
    },
    {
      icon: <Users size={18} />,
      label: t("credits", "Crédits"),
      action: () =>
        toast.info(
          t(
            "creditsInfo",
            "AfriTok — application développée pour offrir une expérience vidéo sociale aux utilisateurs africains."
          )
        ),
    },
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">{t("aboutTitle", "À propos d'AfriTok")}</h2>
      <div className="space-y-1">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-gray-400" />
            <span>{t("version", "Version")}</span>
          </div>
          <span className="text-gray-500 text-sm">1.0.0</span>
        </div>

        {items.map((item, index) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition ${
              index !== items.length - 1 ? "border-b border-gray-800" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        ))}

        <div className="pt-6 pb-2 text-center">
          <p className="text-xs text-gray-500">
            Copyright © 2026 AfriTok. {t("rights", "Tous droits réservés.")}
          </p>
        </div>
      </div>
    </Card>
  );
}
