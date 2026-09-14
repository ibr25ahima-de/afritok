import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2, Replace, Music2, Volume2, VolumeX, Gauge } from "lucide-react";
import { toast } from "sonner";
import AudioSelector from "@/components/AudioSelector";
import { useUpload } from "@/contexts/UploadContext";

type Range = { start: number; end: number };
type Props = {
  src: string; duration: number; trimStart: number; trimEnd: number; cuts: Range[];
  onTrimChange: (start: number, end: number) => void;
  onCutsChange: (cuts: Range[]) => void;
  onCurrentTimeChange?: (time: number) => void;
  onClose: () => void;
};

const fmt = (v: number) => {
  const s = Math.max(0, Math.floor(v));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const seek = (v: HTMLVideoElement, t: number) => new Promise<void>((resolve) => {
  let done = false;
  const finish = () => { if (done) return; done = true; v.removeEventListener("seeked", finish); resolve(); };
  v.addEventListener("seeked", finish, { once: true });
  v.currentTime = t;
  window.setTimeout(finish, 700);
});

const metadata = (v: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
  if (v.readyState >= 1) return resolve();
  const ok = () => { cleanup(); resolve(); };
  const bad = () => { cleanup(); reject(new Error("metadata")); };
  const cleanup = () => { v.removeEventListener("loadedmetadata", ok); v.removeEventListener("error", bad); };
  v.addEventListener("loadedmetadata", ok, { once: true });
  v.addEventListener("error", bad, { once: true });
});

export function ClipEditorFixed({ src, duration, trimStart, trimEnd, cuts, onTrimChange, onCutsChange, onCurrentTimeChange, onClose }: Props) {
  const { setFile } = useUpload();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [time, setTime] = useState(trimStart);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [selectedClip, setSelectedClip] = useState<Range | null>(null);
  const [history, setHistory] = useState<{ cuts: Range[]; splits: number[]; trimStart: number; trimEnd: number }[]>([]);
  const [future, setFuture] = useState<{ cuts: Range[]; splits: number[]; trimStart: number; trimEnd: number }[]>([]);
  const end = trimEnd || duration;

  const removed = useMemo(() => [...cuts].sort((a, b) => a.start - b.start), [cuts]);
  const activeCuts = useMemo(() => {
    const merged: Range[] = [];
    for (const range of removed) {
      const start = Math.max(trimStart, range.start);
      const finish = Math.min(end, range.end);
      if (finish - start <= 0.03) continue;
      const last = merged.at(-1);
      if (last && start <= last.end + 0.03) last.end = Math.max(last.end, finish);
      else merged.push({ start, end: finish });
    }
    return merged;
  }, [removed, trimStart, end]);

  const points = useMemo(() => {
    const middle = splitPoints.filter((p) => p > trimStart + 0.05 && p < end - 0.05);
    const all = [trimStart, ...middle.sort((a, b) => a - b), end];
    return all.filter((p, i) => i === 0 || p - all[i - 1] > 0.05);
  }, [trimStart, end, splitPoints]);

  const clips = useMemo(() => {
    const result: Range[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i], finish = points[i + 1];
      if (finish - start < 0.05) continue;
      if (!activeCuts.some((r) => start >= r.start - 0.02 && finish <= r.end + 0.02)) result.push({ start, end: finish });
    }
    return result;
  }, [points, activeCuts]);

  const pushHistory = () => {
    setHistory((h) => [...h.slice(-19), { cuts: cuts.map((r) => ({ ...r })), splits: [...splitPoints], trimStart, trimEnd: end }]);
    setFuture([]);
  };

  const applyPosition = (value: number) => {
    const clamped = Math.max(trimStart, Math.min(value, end));
    const blocked = activeCuts.find((r) => clamped >= r.start && clamped < r.end);
    const target = blocked ? Math.min(blocked.end + 0.001, end) : clamped;
    if (videoRef.current) videoRef.current.currentTime = target;
    setTime(target);
    onCurrentTimeChange?.(target);
  };

  const timeFromPointer = (clientX: number) => {
    const track = timelineRef.current;
    if (!track || duration <= 0) return trimStart;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };

  const dragTimeline = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation();
    const move = (e: PointerEvent) => applyPosition(timeFromPointer(e.clientX));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    applyPosition(timeFromPointer(event.clientX));
  };

  const selectClip = (clip: Range, event?: React.PointerEvent) => {
    event?.stopPropagation();
    setSelectedClip(clip);
    applyPosition(Math.max(clip.start, Math.min(time, clip.end - 0.01)));
  };

  const split = () => {
    const clip = clips.find((c) => time >= c.start - 0.01 && time <= c.end + 0.01);
    if (!clip || time <= clip.start + 0.08 || time >= clip.end - 0.08) return toast.info("Déplace la ligne blanche à l'endroit exact où tu veux couper");
    if (splitPoints.some((p) => Math.abs(p - time) < 0.08)) return toast.info("La vidéo est déjà coupée à cet endroit");
    pushHistory();
    setSplitPoints((p) => [...p, time].sort((a, b) => a - b));
    setSelectedClip({ start: clip.start, end: time });
    toast.success(`Vidéo divisée à ${fmt(time)}`);
  };

  const deleteClip = () => {
    const clip = selectedClip || clips.find((c) => time >= c.start && time < c.end);
    if (!clip) return toast.info("Sélectionne une partie de la vidéo");
    if (clips.length <= 1) return toast.info("Garder au moins 1 clip");
    pushHistory();
    onCutsChange([...cuts, { start: clip.start, end: clip.end }]);
    setSplitPoints((p) => p.filter((x) => Math.abs(x - clip.start) > 0.05 && Math.abs(x - clip.end) > 0.05));
    const next = clips.find((c) => c.start > clip.end + 0.02) || clips.find((c) => c.end < clip.start - 0.02) || null;
    setSelectedClip(next);
    applyPosition(next?.start ?? trimStart);
    toast.success("Partie supprimée");
  };

  const trimFront = () => {
    if (time <= trimStart + 0.05 || time >= end - 0.05) return toast.info("Déplace la ligne blanche avant de couper");
    pushHistory();
    onTrimChange(time, end);
    setSplitPoints((p) => p.filter((x) => x > time + 0.05));
    onCutsChange(cuts.filter((r) => r.end > time));
    applyPosition(time);
    toast.success("Début supprimé");
  };

  const trimBack = () => {
    if (time <= trimStart + 0.05 || time >= end - 0.05) return toast.info("Déplace la ligne blanche avant de couper");
    pushHistory();
    onTrimChange(trimStart, time);
    setSplitPoints((p) => p.filter((x) => x < time - 0.05));
    onCutsChange(cuts.filter((r) => r.start < time));
    applyPosition(Math.max(trimStart, time - 0.02));
    toast.success("Fin supprimée");
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((f) => [...f, { cuts: cuts.map((r) => ({ ...r })), splits: [...splitPoints], trimStart, trimEnd: end }]);
    setHistory((h) => h.slice(0, -1));
    onCutsChange(previous.cuts);
    onTrimChange(previous.trimStart, previous.trimEnd);
    setSplitPoints(previous.splits);
    applyPosition(previous.trimStart);
  };

  const redo = () => {
    const next = future.at(-1);
    if (!next) return;
    setHistory((h) => [...h, { cuts: cuts.map((r) => ({ ...r })), splits: [...splitPoints], trimStart, trimEnd: end }]);
    setFuture((f) => f.slice(0, -1));
    onCutsChange(next.cuts);
    onTrimChange(next.trimStart, next.trimEnd);
    setSplitPoints(next.splits);
    applyPosition(next.trimStart);
  };

  const replaceSelected = async (file: File) => {
    const clip = selectedClip || clips.find((c) => time >= c.start && time < c.end);
    if (!clip) return toast.info("Sélectionne d'abord le clip à remplacer");
    if (!file.type.startsWith("video/")) return toast.error("Choisis une vidéo");
    const original = document.createElement("video"), replacement = document.createElement("video");
    const url = URL.createObjectURL(file);
    original.src = src; replacement.src = url;
    original.muted = true; replacement.muted = true;
    original.playsInline = true; replacement.playsInline = true;
    try {
      await Promise.all([metadata(original), metadata(replacement)]);
      const canvas = document.createElement("canvas");
      canvas.width = original.videoWidth || 720; canvas.height = original.videoHeight || 1280;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("canvas");
      const stream = canvas.captureStream(30);
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const done = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" })); });
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const draw = async (v: HTMLVideoElement, a: number, b: number) => {
        await seek(v, a); await v.play();
        await new Promise<void>((resolve) => {
          const loop = () => { if (v.currentTime >= b || v.ended) { v.pause(); resolve(); return; } ctx.drawImage(v, 0, 0, canvas.width, canvas.height); requestAnimationFrame(loop); };
          loop();
        });
      };
      recorder.start(200);
      for (const c of clips.filter((c) => c.end <= clip.start)) await draw(original, c.start, c.end);
      await draw(replacement, 0, Math.min(replacement.duration, clip.end - clip.start));
      for (const c of clips.filter((c) => c.start >= clip.end)) await draw(original, c.start, c.end);
      recorder.stop();
      const blob = await done;
      if (blob.size < 1024) throw new Error("empty");
      setFile(new File([blob], "afritok-replaced.webm", { type: blob.type || "video/webm" }));
      toast.success("Clip remplacé"); onClose();
    } catch (error) { console.error(error); toast.error("Impossible de remplacer ce clip sur cet appareil"); }
    finally { URL.revokeObjectURL(url); }
  };

  useEffect(() => {
    let cancelled = false;
    const v = document.createElement("video"); v.src = src; v.muted = true; v.playsInline = true; v.preload = "metadata";
    const run = async () => {
      try {
        await metadata(v);
        const canvas = document.createElement("canvas"); canvas.width = 180; canvas.height = 100;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        const out: string[] = []; const total = v.duration || duration;
        for (let i = 0; i < 16; i++) { if (cancelled) return; await seek(v, total * i / 15); ctx.drawImage(v, 0, 0, canvas.width, canvas.height); out.push(canvas.toDataURL("image/jpeg", 0.62)); }
        if (!cancelled) setThumbs(out);
      } catch {}
    };
    void run();
    return () => { cancelled = true; v.removeAttribute("src"); v.load(); };
  }, [src, duration]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const loaded = () => { v.currentTime = trimStart; v.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };
    const tick = () => {
      const t = v.currentTime;
      const cut = activeCuts.find((r) => t >= r.start && t < r.end);
      if (cut) { v.currentTime = Math.min(cut.end + 0.001, end); return; }
      if (t >= end - 0.04) { v.pause(); setPlaying(false); return; }
      if (t < trimStart) { v.currentTime = trimStart; return; }
      setTime(t); onCurrentTimeChange?.(t);
    };
    const play = () => setPlaying(true), pause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", loaded); v.addEventListener("timeupdate", tick); v.addEventListener("play", play); v.addEventListener("pause", pause);
    return () => { v.removeEventListener("loadedmetadata", loaded); v.removeEventListener("timeupdate", tick); v.removeEventListener("play", play); v.removeEventListener("pause", pause); };
  }, [src, trimStart, end, activeCuts, onCurrentTimeChange]);

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);

  const playToggle = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const activeClip = selectedClip || clips.find((c) => time >= c.start && time < c.end) || clips.at(-1) || null;
  const playheadLeft = duration > 0 ? `${Math.max(0, Math.min(100, time / duration * 100))}%` : "0%";

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden select-none">
      <header className="h-14 shrink-0 flex items-center justify-between px-3">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Retour"><ArrowLeft size={26} /></button>
        <span className="font-semibold text-sm">Modifier</span>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-500" aria-label="Suivant"><Check size={28} strokeWidth={3} /></button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2"><video ref={videoRef} src={src} playsInline muted={muted} className="max-h-full max-w-full object-contain" onClick={playToggle} /></div>

        <div className="shrink-0">
          <div className="h-11 flex items-center justify-center gap-5 text-white/85">
            <span className="text-sm tabular-nums w-[92px] text-right">{fmt(time)} / {fmt(Math.max(0, end - trimStart))}</span>
            <button onClick={playToggle} aria-label="Lecture" className="w-8 flex justify-center">{playing ? <Pause size={20} /> : <Play size={20} fill="white" />}</button>
            <button onClick={undo} disabled={!history.length} aria-label="Annuler" className="disabled:opacity-25"><Undo2 size={20} /></button>
            <button onClick={redo} disabled={!future.length} aria-label="Rétablir" className="disabled:opacity-25"><Redo2 size={20} /></button>
            <button onClick={() => videoRef.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19} /></button>
          </div>

          <div className="px-3 pb-2">
            <div ref={timelineRef} onPointerDown={dragTimeline} className="relative h-[92px] w-full rounded-md overflow-hidden bg-neutral-900 touch-none cursor-ew-resize">
              <div className="absolute inset-0 flex pointer-events-none">
                {(thumbs.length ? thumbs : Array.from({ length: 16 }, () => "")).map((thumb, i) => <div key={i} className="flex-1 min-w-0 border-r border-black/30">{thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}</div>)}
              </div>

              {activeCuts.map((r) => <div key={`${r.start}-${r.end}`} className="absolute inset-y-0 bg-black/90 pointer-events-none" style={{ left: `${r.start / duration * 100}%`, width: `${(r.end - r.start) / duration * 100}%` }} />)}

              {clips.map((clip, i) => {
                const left = clip.start / duration * 100;
                const width = (clip.end - clip.start) / duration * 100;
                const selected = activeClip?.start === clip.start && activeClip?.end === clip.end;
                return <button key={`${clip.start}-${clip.end}`} type="button" onPointerDown={(e) => selectClip(clip, e)} className={`absolute inset-y-0 border-y-2 ${selected ? "border-white" : "border-transparent"}`} style={{ left: `${left}%`, width: `${width}%` }} aria-label={`Clip ${i + 1}`} />;
              })}

              {splitPoints.map((point) => <div key={point} className="absolute top-0 bottom-0 w-[2px] bg-white/90 pointer-events-none" style={{ left: `${point / duration * 100}%` }} />)}

              <div className="absolute top-0 bottom-0 w-[3px] bg-white shadow-[0_0_6px_rgba(0,0,0,.9)] pointer-events-none z-20" style={{ left: playheadLeft, transform: "translateX(-1.5px)" }}><div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white" /></div>
            </div>

            <div className="mt-2 h-9 flex items-center gap-3 border-b border-white/10">
              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Activer le son" : "Couper le son"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              <button onClick={() => setShowAudio((v) => !v)} className="flex items-center gap-2 text-sm"><Music2 size={17} /> Ajouter un son</button>
              {showAudio && <div className="fixed left-3 right-3 bottom-20 z-[110] max-h-[55vh] overflow-auto rounded-2xl bg-neutral-900 p-3"><AudioSelector onSelect={() => setShowAudio(false)} /></div>}
            </div>
          </div>

          <div className="relative border-t border-white/10 px-2 py-2 bg-black">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              <button onClick={split} className="shrink-0 min-w-[78px] h-14 flex flex-col items-center justify-center gap-1 text-xs"><Scissors size={21} />Diviser</button>
              <button onClick={() => replaceRef.current?.click()} className="shrink-0 min-w-[82px] h-14 flex flex-col items-center justify-center gap-1 text-xs"><Replace size={21} />Remplacer</button>
              <button onClick={deleteClip} className="shrink-0 min-w-[82px] h-14 flex flex-col items-center justify-center gap-1 text-xs"><Trash2 size={21} />Supprimer</button>
              <button onClick={() => setShowSpeed((v) => !v)} className="shrink-0 min-w-[76px] h-14 flex flex-col items-center justify-center gap-1 text-xs"><Gauge size={21} />Vitesse</button>
              <button onClick={trimFront} className="shrink-0 min-w-[92px] h-14 flex flex-col items-center justify-center gap-1 text-xs">◀|<span>Couper avant</span></button>
              <button onClick={trimBack} className="shrink-0 min-w-[92px] h-14 flex flex-col items-center justify-center gap-1 text-xs">|▶<span>Couper après</span></button>
            </div>
            {showSpeed && <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 flex gap-2 rounded-xl bg-neutral-900 p-2 shadow-xl">{[0.5, 1, 1.5, 2].map((value) => <button key={value} onClick={() => { setSpeed(value); setShowSpeed(false); }} className={`px-3 py-2 rounded-lg text-sm ${speed === value ? "bg-white text-black" : "bg-white/10"}`}>{value}×</button>)}</div>}
          </div>
        </div>
      </div>

      <input ref={replaceRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) void replaceSelected(f); }} />
    </div>
  );
}
