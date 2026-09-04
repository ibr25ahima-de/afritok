import { useEffect, useState } from "react";
import { Trash2, HardDrive, Wifi, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAppRuntimeSettings } from "@/hooks/useAppRuntimeSettings";
import { toast } from "sonner";

async function getCacheBytes() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return 0;
  const estimate = await navigator.storage.estimate();
  return estimate.usage ?? 0;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function clearBrowserCaches() {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    const names = await window.caches.keys();
    await Promise.all(names.map(name => window.caches.delete(name)));
  }

  // Keep account/session data intact. Only app-generated local runtime data is cleared.
  const preserved = new Set(["afritok-language", "afritok:darkMode", "afritok:dataSaver", "afritok:autoPlay", "afritok:textSize", "afritok:animations"]);
  const removable: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !preserved.has(key) && (key.startsWith("afritok:") || key.startsWith("afritok-"))) removable.push(key);
  }
  removable.forEach(key => localStorage.removeItem(key));
}

export default function CacheSettings() {
  const { dataSaver } = useAppRuntimeSettings();
  const [cacheSize, setCacheSize] = useState("Calcul...");
  const [clearing, setClearing] = useState(false);

  const refresh = async () => setCacheSize(formatBytes(await getCacheBytes()));
  useEffect(() => { void refresh(); }, []);

  const handleClear = async () => {
    if (clearing) return;
    try {
      setClearing(true);
      await clearBrowserCaches();
      await refresh();
      toast.success("Cache AfriTok vidé");
    } catch (error) {
      console.error("[CacheSettings] clear failed", error);
      toast.error("Impossible de vider le cache");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">Cache et données cellulaires</h2>
      <div className="space-y-3">
        <button disabled={clearing} onClick={handleClear} className="w-full flex items-start gap-4 p-4 bg-black/50 rounded-lg hover:bg-white/5 transition text-left border border-gray-800 disabled:opacity-60">
          <Trash2 size={20} className="mt-1 text-gray-400" />
          <div className="flex-1">
            <p className="font-semibold">{clearing ? "Vidage en cours..." : "Libérer de l'espace"}</p>
            <p className="text-sm text-gray-400">Efface uniquement le cache local d'AfriTok, sans déconnecter votre compte.</p>
          </div>
          <ChevronRight size={20} className="text-gray-600 self-center" />
        </button>

        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3"><HardDrive size={18} className="text-gray-400" /><span>Cache local</span></div>
          <span className="text-sm text-gray-500">{cacheSize}</span>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3"><Wifi size={18} className="text-gray-400" /><span>Économie de données</span></div>
          <span className={dataSaver ? "text-green-400 text-sm" : "text-gray-500 text-sm"}>{dataSaver ? "Activée" : "Désactivée"}</span>
        </div>
      </div>
    </Card>
  );
}
