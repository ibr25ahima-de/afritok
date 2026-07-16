import { Languages, Moon, Wifi, PlayCircle, Type, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function DisplaySettings() {
  const settings = [
    { icon: <Languages size={18} />, label: "Langue", value: "Français" },
    { icon: <Moon size={18} />, label: "Mode sombre", value: "Système" },
    { icon: <Wifi size={18} />, label: "Économie de données", value: "Désactivé" },
    { icon: <PlayCircle size={18} />, label: "Lecture automatique", value: "Wi-Fi uniquement" },
    { icon: <Type size={18} />, label: "Taille du texte", value: "Normale" },
    { icon: <Sparkles size={18} />, label: "Animations", value: "Activées" },
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">
        Contenu et affichage
      </h2>

      <div className="space-y-1">
        {settings.map((item, index) => (
          <button 
            key={item.label}
            className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition ${
              index !== settings.length - 1 ? "border-b border-gray-800" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{item.icon}</span>
              <span>{item.label}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">{item.value}</span>
              <ChevronRight size={16} />
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
