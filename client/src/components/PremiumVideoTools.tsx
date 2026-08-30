import { useEffect, useState } from "react";
import { Lock, Sparkles, Gauge, Clock3, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function PremiumVideoTools() {
  const { data } = trpc.subscription.status.useQuery(undefined, { staleTime: 60_000 });
  const isPremium = data?.isPremium === true;
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [scheduledAt, setScheduledAt] = useState("");
  const [commentsMode, setCommentsMode] = useState<"all" | "followers" | "off">("all");

  useEffect(() => {
    if (!isPremium) {
      setQuality("standard");
      setScheduledAt("");
      setCommentsMode("all");
    }
  }, [isPremium]);

  if (!isPremium) return null;

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-amber-400" size={20} />
        <div>
          <h3 className="font-bold text-white">Outils vidéo Premium</h3>
          <p className="text-xs text-gray-400">Options avancées disponibles avec votre abonnement.</p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-black/40 p-3">
        <span className="flex items-center gap-2"><Gauge size={17} className="text-amber-400" />Qualité de publication</span>
        <select value={quality} onChange={e => setQuality(e.target.value as "standard" | "hd")} className="rounded-lg bg-gray-900 px-3 py-2 text-sm">
          <option value="standard">Standard</option>
          <option value="hd">HD Premium</option>
        </select>
      </label>

      <label className="block rounded-xl bg-black/40 p-3">
        <span className="flex items-center gap-2 mb-2"><Clock3 size={17} className="text-amber-400" />Publication programmée</span>
        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white" />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-black/40 p-3">
        <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-amber-400" />Contrôle des commentaires</span>
        <select value={commentsMode} onChange={e => setCommentsMode(e.target.value as "all" | "followers" | "off")} className="rounded-lg bg-gray-900 px-3 py-2 text-sm">
          <option value="all">Tout le monde</option>
          <option value="followers">Abonnés</option>
          <option value="off">Désactivés</option>
        </select>
      </label>

      <p className="flex items-center gap-2 text-xs text-gray-500"><Lock size={13} /> Ces options sont visibles uniquement pour un abonnement Premium actif.</p>
    </section>
  );
}
