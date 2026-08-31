import { Loader2, Radio, Users } from "lucide-react";
import { LIVE_STAGE_CAPACITIES, type LiveStageCapacity } from "./live-stage-rules";
import { LiveLayoutSelector } from "./LiveLayoutSelector";
import type { LiveLayoutId } from "./live-layouts";

type LiveCreatePanelProps = {
  title: string;
  description: string;
  capacity: LiveStageCapacity;
  layout: LiveLayoutId;
  isStarting: boolean;
  error?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCapacityChange: (value: LiveStageCapacity) => void;
  onLayoutChange: (value: LiveLayoutId) => void;
  onStart: () => void;
};

export function LiveCreatePanel({ title, description, capacity, layout, isStarting, error, onTitleChange, onDescriptionChange, onCapacityChange, onLayoutChange, onStart }: LiveCreatePanelProps) {
  return (
    <main className="min-h-screen bg-gray-950 text-white px-5 py-8 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-3xl bg-gray-900 border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center"><Radio /></div><div><h1 className="text-2xl font-bold">Passer en Live</h1><p className="text-sm text-gray-400">Choisis le thème, la présentation et le nombre de personnes sur scène.</p></div></div>
        <label className="block text-sm font-semibold mb-2">Thème du Live</label>
        <input value={title} onChange={(e) => onTitleChange(e.target.value)} maxLength={120} placeholder="Ex. Discussion, musique, actualité..." className="w-full rounded-2xl bg-gray-950 border border-white/10 px-4 py-3 outline-none focus:border-red-400" />
        <label className="block text-sm font-semibold mt-5 mb-2">Description (facultatif)</label>
        <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} maxLength={500} rows={3} placeholder="Présente ton Live..." className="w-full rounded-2xl bg-gray-950 border border-white/10 px-4 py-3 outline-none resize-none focus:border-red-400" />
        <LiveLayoutSelector value={layout} onChange={onLayoutChange} />
        <label className="block text-sm font-semibold mt-5 mb-3">Personnes autorisées à monter</label>
        <div className="grid grid-cols-4 gap-2">{LIVE_STAGE_CAPACITIES.map((value) => <button key={value} type="button" onClick={() => onCapacityChange(value)} className={`rounded-xl py-2.5 font-bold border ${capacity === value ? "bg-red-500 border-red-400" : "bg-gray-950 border-white/10 text-gray-300"}`}>{value}</button>)}</div>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400"><Users size={15} /> Jusqu'à {capacity} personne{capacity > 1 ? "s" : ""} sur scène.</div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-950/70 border border-red-800 p-3 text-sm text-red-200">{error}</p>}
        <button type="button" disabled={isStarting || !title.trim()} onClick={onStart} className="w-full mt-6 rounded-2xl bg-red-500 py-4 font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[.99]">{isStarting ? <Loader2 className="animate-spin" size={20} /> : <Radio size={20} />} {isStarting ? "Démarrage..." : "Démarrer le Live"}</button>
      </div>
    </main>
  );
}
