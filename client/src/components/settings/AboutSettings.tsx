import { Info, RefreshCw, FileCode, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const REPOSITORY_URL = "https://github.com/ibr25ahima-de/afritok";
const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function AboutSettings() {
  const items = [
    { icon: <RefreshCw size={18} />, label: "Vérifier les mises à jour", action: () => openExternal(REPOSITORY_URL) },
    { icon: <FileCode size={18} />, label: "Licence Open Source", action: () => openExternal(LICENSE_URL) },
    { icon: <Users size={18} />, label: "Crédits", action: () => toast.info("Les crédits du projet sont disponibles dans le dépôt AfriTok.") },
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">À propos d'AfriTok</h2>
      <div className="space-y-1">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3"><Info size={18} className="text-gray-400" /><span>Version</span></div>
          <span className="text-gray-500 text-sm">1.0.0</span>
        </div>
        {items.map((item, index) => (
          <button key={item.label} onClick={item.action} className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition ${index !== items.length - 1 ? "border-b border-gray-800" : ""}`}>
            <div className="flex items-center gap-3"><span className="text-gray-400">{item.icon}</span><span>{item.label}</span></div>
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        ))}
        <div className="pt-6 pb-2 text-center"><p className="text-xs text-gray-500">Copyright © 2026 AfriTok. Tous droits réservés.</p></div>
      </div>
    </Card>
  );
}
