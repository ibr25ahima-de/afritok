import { Languages, Moon, Wifi, PlayCircle, Type, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  settings: { language: string; darkMode: string; dataSaver: boolean; autoPlay: string; textSize: string; animations: boolean };
  updateSetting: (key: string, value: any) => void;
}

const LANGUAGES = ["Français", "English", "Kiswahili", "Yorùbá", "Hausa", "isiZulu"];

export default function DisplaySettings({ settings, updateSetting }: Props) {
  const items = [
    { key: "language", icon: <Languages size={18} />, label: "Langue", value: settings.language },
    { key: "darkMode", icon: <Moon size={18} />, label: "Mode sombre", value: settings.darkMode },
    { key: "dataSaver", icon: <Wifi size={18} />, label: "Économie de données", value: settings.dataSaver ? "Activé" : "Désactivé" },
    { key: "autoPlay", icon: <PlayCircle size={18} />, label: "Lecture automatique", value: settings.autoPlay },
    { key: "textSize", icon: <Type size={18} />, label: "Taille du texte", value: settings.textSize },
    { key: "animations", icon: <Sparkles size={18} />, label: "Animations", value: settings.animations ? "Activées" : "Désactivées" },
  ];

  const handleClick = (key: string) => {
    switch (key) {
      case "darkMode":
        updateSetting("darkMode", settings.darkMode === "Système" ? "Sombre" : settings.darkMode === "Sombre" ? "Clair" : "Système");
        break;
      case "dataSaver":
        updateSetting("dataSaver", !settings.dataSaver);
        break;
      case "animations":
        updateSetting("animations", !settings.animations);
        break;
      case "language": {
        const index = Math.max(0, LANGUAGES.indexOf(settings.language));
        updateSetting("language", LANGUAGES[(index + 1) % LANGUAGES.length]);
        break;
      }
      case "autoPlay":
        updateSetting("autoPlay", settings.autoPlay === "Wi-Fi uniquement" ? "Toujours" : settings.autoPlay === "Toujours" ? "Jamais" : "Wi-Fi uniquement");
        break;
      case "textSize":
        updateSetting("textSize", settings.textSize === "Normale" ? "Grande" : settings.textSize === "Grande" ? "Petite" : "Normale");
        break;
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">Contenu et affichage</h2>
      <div className="space-y-1">
        {items.map((item, index) => (
          <button key={item.key} onClick={() => handleClick(item.key)} className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition ${index !== items.length - 1 ? "border-b border-gray-800" : ""}`}>
            <div className="flex items-center gap-3"><span className="text-gray-400">{item.icon}</span><span>{item.label}</span></div>
            <div className="flex items-center gap-2 text-gray-500"><span className="text-sm">{item.value}</span><ChevronRight size={16} /></div>
          </button>
        ))}
      </div>
    </Card>
  );
}
