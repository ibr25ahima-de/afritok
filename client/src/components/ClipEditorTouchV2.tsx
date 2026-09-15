import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Range = { start: number; end: number; id?: string };
type HistoryState = { cuts: Range[]; splits: number[]; start: number; end: number };
type Props = {
  src: string;
  onAddClip?: (file: File) => void;
  duration: number;
  trimStart: number;
  trimEnd: number;
  cuts: Range[];
  onTrimChange: (start: number, end: number) => void;
  onCutsChange: (cuts: Range[]) => void;
  onCurrentTimeChange?: (time: number) => void;
  onClose: () => void;
};

const fmt = (v: number) => {
  if (!Number.isFinite(v) || v < 0) return "00:00";
  const s = Math.floor(v);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const merge = (ranges: Range[]) => ranges
  .filter(r => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end - r.start > 0.05)
  .sort((a, b) => a.start - b.start)
  .reduce<Range[]>((out, r) => {
    const last = out[out.length - 1];
    if (last && r.start <= last.end + 0.03) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
    return out;
  }, []);

export function ClipEditorTouchV2({ src, duration, trimStart, trimEnd, cuts, onTrimChange, onCutsChange, onCurrentTimeChange, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const dragging = useRef(false);
  const [mediaDuration, setMediaDuration] = useState(Number.isFinite(duration) && duration > 0 ? duration : 0);
  const [time, setTime] = useState(Math.max(0, trimStart || 0));
  const [playing, setPlaying] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [splits, setSplits] = useState<number[]>([]);
  const [selected, setSelected] = useState<Range | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const totalDuration = mediaDuration > 0 ? mediaDuration : (duration > 0 ? duration : 0);
  const start = Math.max(0, Math.min(trimStart || 0, totalDuration || trimStart || 0));
  const end = Math.max(start, Math.min(trimEnd > 0 ? trimEnd : totalDuration, totalDuration || trimEnd || start));
  const removed = useMemo(() => merge(cuts), [cuts]);
  const boundaries = useMemo(() => [start, ...splits.filter(x => x > start + 0.05 && x < end - 0.05), end].sort((a, b) => a - b), [start, end, splits]);
  const clips = useMemo(() => boundaries.slice(0, -1).map((a, i) => ({ start: a, end: boundaries[i + 1] })).filter(c => c.end - c.start > 0.05 && !removed.some(r => c.start >= r.start - 0.02 && c.end <= r.end + 0.02)), [boundaries, removed]);
  const pct = ((time - start) / Math.max(0.001, end - start)) * 100;

  useEffect(() => { timeRef.current = Math.max(start, Math.min(time, end)); }, [time, start, end]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      setMediaDuration(d);
      if (!(trimEnd > 0)) onTrimChange(start, d);
      const initial = Math.max(0, Math.min(timeRef.current || trimStart || 0, d));
      timeRef.current = initial;
      setTime(initial);
      onCurrentTimeChange?.(initial);
    };
    const onTime = () => {
      const t = v.currentTime;
      const cut = removed.find(r => t >= r.start && t < r.end);
      if (cut) { v.currentTime = Math.min(cut.end + 0.001, end); return; }
      if (t >= end - 0.03) { v.pause(); setPlaying(false); setTime(end); timeRef.current = end; return; }
      if (!dragging.current) { setTime(t); timeRef.current = t; onCurrentTimeChange?.(t); }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    if (v.readyState >= 1) onMeta();
    return () => { v.removeEventListener("loadedmetadata", onMeta); v.removeEventListener("timeupdate", onTime); v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause); };
  }, [src, trimEnd, trimStart, start, end, removed, onCurrentTimeChange, onTrimChange]);

  useEffect(() => {
    let cancelled = false;
    const v = document.createElement("video");
    v.src = src; v.muted = true; v.playsInline = true; v.preload = "metadata";
    const load = new Promise<void>(resolve => {
      if (v.readyState >= 1) resolve();
      else v.addEventListener("loadedmetadata", () => resolve(), { once: true });
    });
    const seek = (t: number) => new Promise<void>(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; v.removeEventListener("seeked", finish); resolve(); };
      v.addEventListener("seeked", finish, { once: true }); v.currentTime = t; window.setTimeout(finish, 700);
    });
    (async () => {
      try {
        await load;
        if (!cancelled && Number.isFinite(v.duration) && v.duration > 0) setMediaDuration(v.duration);
        const h = 64, aspect = v.videoWidth > 0 && v.videoHeight > 0 ? v.videoWidth / v.videoHeight : 9 / 16;
        const canvas = document.createElement("canvas"); canvas.height = h; canvas.width = Math.max(1, Math.round(h * aspect));
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        const out: string[] = [];
        for (let i = 0; i < 18 && !cancelled; i++) { await seek((v.duration || totalDuration) * i / 17); ctx.drawImage(v, 0, 0, canvas.width, canvas.height); out.push(canvas.toDataURL("image/jpeg", 0.55)); }
        if (!cancelled) setThumbs(out);
      } catch { /* preview thumbnails are optional */ }
    })();
    return () => { cancelled = true; v.removeAttribute("src"); v.load(); };
  }, [src, totalDuration]);

  const seekTo = (raw: number) => {
    const safe = Math.max(start, Math.min(raw, end));
    const cut = removed.find(r => safe >= r.start && safe < r.end);
    const target = cut ? Math.min(cut.end + 0.001, end) : safe;
    timeRef.current = target; setTime(target); onCurrentTimeChange?.(target);
    if (videoRef.current && Math.abs(videoRef.current.currentTime - target) > 0.01) videoRef.current.currentTime = target;
  };
  const remember = () => setHistory(h => [...h.slice(-19), { cuts: cuts.map(r => ({ ...r })), splits: [...splits], start, end }]);
  const split = () => {
    const t = timeRef.current;
    if (t <= start + 0.08 || t >= end - 0.08) return toast.info("Déplace la ligne blanche à l'endroit de la coupe");
    if (splits.some(x => Math.abs(x - t) < 0.08)) return toast.info("La vidéo est déjà divisée ici");
    remember(); setSplits(s => [...s, t].sort((a, b) => a - b)); setSelected(null); toast.success(`Vidéo divisée à ${fmt(t)}`);
  };
  const deleteClip = () => {
    const t = timeRef.current;
    const clip = selected || clips.find(c => t >= c.start && t < c.end);
    if (!clip) return toast.info("Sélectionne la partie à supprimer");
    if (clips.length <= 1) return toast.info("Garder au moins 1 partie");
    remember(); onCutsChange(merge([...cuts, clip])); setSplits(s => s.filter(x => x <= clip.start + 0.05 || x >= clip.end - 0.05)); setSelected(null);
    seekTo(clips.find(c => c.start > clip.end + 0.02)?.start ?? start); toast.success("Partie supprimée");
  };
  const removeFront = () => {
    const t = timeRef.current;
    if (t <= start + 0.05 || t >= end - 0.05) return toast.info("Place la ligne blanche après le début");
    remember(); onTrimChange(t, end); onCutsChange(cuts.filter(r => r.end > t)); setSplits(s => s.filter(x => x > t + 0.05)); seekTo(t); toast.success("Début supprimé");
  };
  const removeBack = () => {
    const t = timeRef.current;
    if (t <= start + 0.05 || t >= end - 0.05) return toast.info("Place la ligne blanche avant la fin");
    remember(); onTrimChange(start, t); onCutsChange(cuts.filter(r => r.start < t)); setSplits(s => s.filter(x => x < t - 0.05)); seekTo(Math.max(start, t - 0.01)); toast.success("Fin supprimée");
  };
  const toggle = () => { const v = videoRef.current; if (!v) return; if (v.paused) { if (v.currentTime < start || v.currentTime >= end) v.currentTime = start; v.play().catch(() => {}); } else v.pause(); };
  const drag = (clientX: number) => { const el = timelineRef.current; if (!el) return; const r = el.getBoundingClientRect(); seekTo(start + Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width))) * (end - start)); };

  return <div className="fixed inset-0 z-[110] bg-black text-white flex flex-col overflow-hidden">
    <header className="h-14 shrink-0 flex items-center justify-between px-3"><button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Retour"><ArrowLeft size={26}/></button><span className="font-semibold text-sm">Modifier la vidéo</span><button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400" aria-label="Terminer"><Check size={27}/></button></header>
    <div className="flex-1 min-h-0 flex flex-col"><div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2"><video ref={videoRef} src={src} playsInline className="max-h-full max-w-full object-contain" onClick={toggle}/></div>
      <div className="shrink-0 px-3"><div className="h-11 flex items-center justify-center gap-6"><span className="text-sm tabular-nums">{fmt(time-start)} / {fmt(end-start)}</span><button onClick={toggle} aria-label={playing ? "Pause" : "Lire"}>{playing ? <Pause size={20}/> : <Play size={20} fill="white"/>}</button><button onClick={() => { const h = history.at(-1); if (!h) return; setFuture(f => [...f, { cuts: cuts.map(r => ({...r})), splits:[...splits], start, end }]); setHistory(x => x.slice(0,-1)); onCutsChange(h.cuts); onTrimChange(h.start,h.end); setSplits(h.splits); seekTo(h.start); }} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler"><Undo2 size={20}/></button><button onClick={() => { const h = future.at(-1); if (!h) return; setHistory(x => [...x, { cuts: cuts.map(r => ({...r})), splits:[...splits], start, end }]); setFuture(x => x.slice(0,-1)); onCutsChange(h.cuts); onTrimChange(h.start,h.end); setSplits(h.splits); seekTo(h.start); }} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir"><Redo2 size={20}/></button><button onClick={() => videoRef.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19}/></button></div>
      <div className="pb-3"><div ref={timelineRef} className="relative overflow-hidden h-[84px] rounded-md bg-white/10 select-none" style={{touchAction:"none"}} onPointerDown={e => { if (e.pointerType !== "touch" && e.button !== 0) return; dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); videoRef.current?.pause(); setPlaying(false); drag(e.clientX); }} onPointerMove={e => { if (dragging.current) drag(e.clientX); }} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
        <div className="flex h-16 w-full overflow-hidden pointer-events-none rounded-md">{(thumbs.length ? thumbs : Array.from({length:18})).map((f,i)=><div key={i} className="h-16 flex-1 min-w-0 border-r border-black/30 bg-white/5">{f && <img src={f} alt="" draggable={false} className="h-16 w-full object-cover"/>}</div>)}</div>
        {clips.map(c => { const total=Math.max(0.001,end-start), left=(c.start-start)/total*100, width=(c.end-c.start)/total*100, is=selected?.start===c.start&&selected?.end===c.end; return <button key={`${c.start}-${c.end}`} type="button" aria-label={`Clip ${fmt(c.start)} à ${fmt(c.end)}`} onClick={e=>{e.stopPropagation();setSelected(c);seekTo(c.start)}} className="absolute top-0 bottom-0 z-20" style={{left:`${left}%`,width:`${width}%`,border:is?"2px solid white":"2px solid transparent",background:"transparent",borderRadius:6}}/>; })}
        {removed.map((r,i)=><div key={i} className="absolute inset-y-0 bg-black/75 pointer-events-none z-10" style={{left:`${(r.start-start)/Math.max(.001,end-start)*100}%`,width:`${(r.end-r.start)/Math.max(.001,end-start)*100}%`}}/>)}
        {splits.map(x=><div key={x} className="absolute inset-y-0 w-[2px] bg-white/70 pointer-events-none z-30" style={{left:`${(x-start)/Math.max(.001,end-start)*100}%`}}/>)}
        <div className="absolute top-0 bottom-0 w-[3px] bg-white z-40 pointer-events-none" style={{left:`${pct}%`}}/><div className="absolute -top-2 -translate-x-1/2 w-6 h-6 rounded-full bg-white z-50 pointer-events-none" style={{left:`${pct}%`}}/>
      </div><div className="flex justify-between text-[11px] text-white/60 mt-1 px-1"><span>{fmt(0)}</span><span>{fmt(end-start)}</span></div></div></div></div>
    <div className="shrink-0 border-t border-white/10 bg-black px-2 py-3 pb-[max(12px,env(safe-area-inset-bottom))]"><div className="flex items-center gap-2 overflow-x-auto px-2 py-2"><button type="button" onClick={removeFront} className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-2"><Scissors className="h-5 w-5"/><span className="text-xs">Début</span></button><button type="button" onClick={removeBack} className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-2"><Scissors className="h-5 w-5 rotate-180"/><span className="text-xs">Fin</span></button><button type="button" onClick={split} className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-2"><Scissors className="h-5 w-5"/><span className="text-xs">Diviser</span></button><button type="button" onClick={deleteClip} className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-2"><Trash2 className="h-5 w-5"/><span className="text-xs">Supprimer</span></button></div></div>
  </div>;
}
