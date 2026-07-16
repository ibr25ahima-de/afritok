import { Trash2, HardDrive, Download, Wifi, Film, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function CacheSettings() {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">
        Cache et données cellulaires
      </h2>

      <div className="space-y-4">
        {/* LIBÉRER DE L'ESPACE SECTION */}
        <button className="w-full flex items-start gap-4 p-4 bg-black/50 rounded-lg hover:bg-white/5 transition text-left border border-gray-800">
          <div className="mt-1 text-gray-400">
            <Trash2 size={20} />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Libérer de l'espace</p>
            <p className="text-sm text-gray-400">Gérez les vidéos, brouillons et cache.</p>
          </div>
          <ChevronRight size={20} className="text-gray-600 self-center" />
        </button>

        <div className="space-y-1">
          {/* CACHE */}
          <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition border-b border-gray-800">
            <div className="flex items-center gap-3">
              <HardDrive size={18} className="text-gray-400" />
              <span>Cache</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">125 MB</span>
              <ChevronRight size={16} />
            </div>
          </button>

          {/* TÉLÉCHARGEMENTS */}
          <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Download size={18} className="text-gray-400" />
              <span>Téléchargements</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">Gérer</span>
              <ChevronRight size={16} />
            </div>
          </button>

          {/* ÉCONOMIE DE DONNÉES */}
          <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Wifi size={18} className="text-gray-400" />
              <span>Économie de données</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">Désactivée</span>
              <ChevronRight size={16} />
            </div>
          </button>

          {/* QUALITÉ DES VIDÉOS */}
          <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition">
            <div className="flex items-center gap-3">
              <Film size={18} className="text-gray-400" />
              <span>Qualité des vidéos</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm">Automatique</span>
              <ChevronRight size={16} />
            </div>
          </button>
        </div>
      </div>
    </Card>
  );
}
