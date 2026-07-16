import { Info, RefreshCw, FileCode, Gavel, Users, Globe, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AboutSettings() {
  const items = [
    { icon: <RefreshCw size={18} />, label: "Vérifier les mises à jour" },
    { icon: <FileCode size={18} />, label: "Licence Open Source" },
    { icon: <Gavel size={18} />, label: "Mentions légales" },
    { icon: <Users size={18} />, label: "Crédits" },
    { icon: <Globe size={18} />, label: "Site officiel" },
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">
        À propos d'AfriTok
      </h2>

      <div className="space-y-1">
        {/* VERSION INFO */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-gray-400" />
            <span>Version</span>
          </div>
          <span className="text-gray-500 text-sm">1.0.0</span>
        </div>

        {/* INTERACTIVE ITEMS */}
        {items.map((item, index) => (
          <button
            key={item.label}
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

        {/* COPYRIGHT */}
        <div className="pt-6 pb-2 text-center">
          <p className="text-xs text-gray-500">
            Copyright © 2026 AfriTok. Tous droits réservés.
          </p>
        </div>
      </div>
    </Card>
  );
}
