import { useState } from "react";
import { Clock3, Gauge, ShieldCheck, Sparkles } from "lucide-react";

export type PremiumPublishOptionsValue = {
  quality: "standard" | "hd";
  scheduledAt: string | null;
  commentsMode: "all" | "followers" | "off";
};

export function PremiumPublishOptions({ enabled, onChange }: { enabled: boolean; onChange: (value: PremiumPublishOptionsValue) => void }) {
  const [value, setValue] = useState<PremiumPublishOptionsValue>({ quality: "standard", scheduledAt: null, commentsMode: "all" });
  if (!enabled) return null;
  const update = (patch: Partial<PremiumPublishOptionsValue>) => {
    const next = { ...value, ...patch };
    setValue(next);
    onChange(next);
  };
  return (
    <section className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 mb-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold"><Sparkles className="text-amber-400" size={18} /> Options Premium de publication</div>
      <label className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><Gauge size={16} />Qualité</span><select value={value.quality} onChange={e => update({ quality: e.target.value as "standard" | "hd" })} className="bg-slate-800 rounded px-2 py-1"><option value="standard">Standard</option><option value="hd">HD Premium</option></select></label>
      <label className="block text-sm"><span className="flex items-center gap-2 mb-1"><Clock3 size={16} />Publication programmée</span><input type="datetime-local" value={value.scheduledAt ? value.scheduledAt.slice(0, 16) : ""} onChange={e => update({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full bg-slate-800 rounded px-2 py-2" /></label>
      <label className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><ShieldCheck size={16} />Commentaires</span><select value={value.commentsMode} onChange={e => update({ commentsMode: e.target.value as PremiumPublishOptionsValue["commentsMode"] })} className="bg-slate-800 rounded px-2 py-1"><option value="all">Tout le monde</option><option value="followers">Abonnés</option><option value="off">Désactivés</option></select></label>
    </section>
  );
}
