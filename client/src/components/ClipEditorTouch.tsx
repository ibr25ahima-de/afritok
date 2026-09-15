import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Range = { start: number; end: number };
type HistoryState = { cuts: Range[]; splits: number[]; start: number; end: number };
type Props = {
  src: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  cuts: Range[];
  onTrimChange: (start: number, end: number) => void;
  onCutsChange: (cuts: Range[]) => void;
  onCurrentTimeChange?: (time: number) => void;
  onClose: () => void;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const timeLabel = (value: number) => {
  const s = Math.max(0, Math.floor(value));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const merge = (ranges: Range[]) => ranges
  .filter((r) => r.end - r.start > 0.05)
  .sort((a, b) => a.start - b.start)
  .reduce<Range[]>((out, r) => {
    const last = out[out.length - 1];
    if (last && r.start <= last.end + 0.03) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
    return out;
  }, []);

export function ClipEditorTouch({
  src, duration, trimStart, trimEnd, cuts,
  onTrimChange, onCutsChange, onCurrentTimeChange, onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastTouchRef = useRef(0);
  const [time, setTime] = useState(trimStart);
  const [playing, setPlaying] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [splits, setSplits] = useState<number[]>([]);
  const [selected, setSelected] = useState<Range | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const end = trimEnd > 0 ? trimEnd : duration;
  const removed = useMemo(() => merge(cuts), [cuts]);

  const boundaries = useMemo(
    () => [trimStart, ...splits.filter((p) => p > trimStart + 0.05 && p < end - 0.05), end].sort((a, b) => a - b),
    [trimStart, end, splits],
  );
  const clips = useMemo(() => {
    const result: Range[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const a = boundaries[i];
      const b = boundaries[i + 1];
      if (b - a > 0.05 && !removed.some((r) => a >= r.start - 0.02 && b <= r.end + 0.02)) {
        result.push({ start: a, end: b });
      }
    }
    return result;
  }, [boundaries, removed]);

  const remember = () => {
    setHistory((h) => [...h.slice(-19), {
      cuts: cuts.map((r) => ({ ...r })),
      splits: [...splits],
      start: trimStart,
      end,
    }]);
    setFuture([]);
  };

  const seek = (raw: number) => {
    const limit = clamp(raw, trimStart, end);
    const cut = removed.find((r) => limit >= r.start && limit < r.end);
    const target = cut ? clamp(cut.end + 0.001, trimStart, end) : limit;
    setTime(target);
    onCurrentTimeChange?.(target);
    const video = videoRef.current;
    if (video && Math.abs(video.currentTime - target) > 0.003) video.currentTime = target;
  };

  // This is the actual finger-controlled timeline. No horizontal scrolling and no invisible range input.
  const timeFromClientX = (clientX: number) => {
    const el = timelineRef.current;
    if (!el) return trimStart;
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    return trimStart + (x / Math.max(1, rect.width)) * (end - trimStart);
  };

  const startDrag = (clientX: number) => {
    draggingRef.current = true;
    videoRef.current?.pause();
    setPlaying(false);
    seek(timeFromClientX(clientX));
  };
  const moveDrag = (clientX: number) => {
    if (!draggingRef.current) return;
    seek(timeFromClientX(clientX));
  };
  const finishDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const current = clamp(time, trimStart, end);
    const clip = clips.find((c) => current >= c.start - 0.001 && current <= c.end + 0.001);
    if (clip) setSelected(clip);
  };

  // Native touch listeners are deliberately used here so Android keeps sending move events while the finger is sliding.
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      lastTouchRef.current = Date.now();
      e.preventDefault();
      startDrag(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || !e.touches[0]) return;
      e.preventDefault();
      moveDrag(e.touches[0].clientX);
    };
    const onTouchEnd = () => finishDrag();
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [trimStart, end, removed, clips, time]);

  // Mouse/stylus/desktop fallback.
  useEffect(() => {
    const onMove = (e: PointerEvent) => moveDrag(e.clientX);
    const onUp = () => finishDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    startDrag(e.clientX);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const metadata = () => seek(video.currentTime || trimStart);
    const tick = () => {
      const t = video.currentTime;
      const cut = removed.find((r) => t >= r.start && t < r.end);
      if (cut) {
        video.currentTime = clamp(cut.end + 0.001, trimStart, end);
        return;
      }
      if (t >= end - 0.03) {
        video.pause();
        setPlaying(false);
        setTime(end);
        return;
      }
      if (!draggingRef.current && t >= trimStart) {
        setTime(t);
        onCurrentTimeChange?.(t);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("loadedmetadata", metadata);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("loadedmetadata", metadata);
      video.removeEventListener("timeupdate", tick);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [trimStart, end, removed, onCurrentTimeChange]);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const waitMetadata = new Promise<void>((resolve, reject) => {
      if (video.readyState >= 1) return resolve();
      const ok = () => { cleanup(); resolve(); };
      const bad = () => { cleanup(); reject(new Error("metadata")); };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", ok);
        video.removeEventListener("error", bad);
      };
      video.addEventListener("loadedmetadata", ok, { once: true });
      video.addEventListener("error", bad, { once: true });
    });
    const seekFrame = (t: number) => new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener("seeked", finish);
        resolve();
      };
      video.addEventListener("seeked", finish, { once: true });
      video.currentTime = t;
      window.setTimeout(finish, 500);
    });
    (async () => {
      try {
        await waitMetadata;
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 135;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const total = video.duration || duration;
        const frames: string[] = [];
        for (let i = 0; i < 18; i++) {
          if (cancelled) return;
          await seekFrame(total * i / 17);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL("image/jpeg", 0.55));
        }
        if (!cancelled) setThumbs(frames);
      } catch {}
    })();
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, duration]);

  const split = () => {
    const clip = clips.find((c) => time > c.start + 0.08 && time < c.end - 0.08);
    if (!clip) return toast.info("Déplace la ligne blanche à l'endroit exact de la coupe");
    if (splits.some((p) => Math.abs(p - time) < 0.08)) return toast.info("La vidéo est déjà divisée ici");
    remember();
    setSplits((p) => [...p, time].sort((a, b) => a - b));
    setSelected(null);
    toast.success("Vidéo divisée à " + timeLabel(time));
  };

  const deleteSelected = () => {
    const clip = selected || clips.find((c) => time >= c.start && time <= c.end);
    if (!clip) return toast.info("Sélectionne une partie de la vidéo");
    if (clips.length <= 1) return toast.info("Garder au moins 1 clip");
    remember();
    onCutsChange(merge([...cuts, clip]));
    setSplits((p) => p.filter((x) => x < clip.start - 0.05 || x > clip.end + 0.05));
    setSelected(null);
    const next = clips.find((c) => c.start > clip.end + 0.02)?.start ?? trimStart;
    seek(next);
    toast.success("Partie supprimée");
  };

  const deleteBefore = () => {
    if (time <= trimStart + 0.05) return toast.info("Glisse la ligne vers la droite avant de supprimer le début");
    remember();
    onTrimChange(time, end);
    onCutsChange(cuts.filter((r) => r.end > time));
    setSplits((p) => p.filter((x) => x > time + 0.05));
    seek(time);
    toast.success("Tout ce qui est avant la ligne a été supprimé");
  };

  const deleteAfter = () => {
    if (time >= end - 0.05) return toast.info("Glisse la ligne vers la gauche avant de supprimer la fin");
    remember();
    onTrimChange(trimStart, time);
    onCutsChange(cuts.filter((r) => r.start < time));
    setSplits((p) => p.filter((x) => x < time - 0.05));
    seek(time - 0.01);
    toast.success("Tout ce qui est après la ligne a été supprimé");
  };

  const undo = () => {
    const h = history.at(-1);
    if (!h) return;
    setFuture((f) => [...f, { cuts: cuts.map((r) => ({ ...r })), splits: [...splits], start: trimStart, end }]);
    setHistory((h2) => h2.slice(0, -1));
    onCutsChange(h.cuts);
    onTrimChange(h.start, h.end);
    setSplits(h.splits);
    setSelected(null);
    seek(h.start);
  };

  const redo = () => {
    const h = future.at(-1);
    if (!h) return;
    setHistory((h2) => [...h2, { cuts: cuts.map((r) => ({ ...r })), splits: [...splits], start: trimStart, end }]);
    setFuture((f) => f.slice(0, -1));
    onCutsChange(h.cuts);
    onTrimChange(h.start, h.end);
    setSplits(h.splits);
    setSelected(null);
    seek(h.start);
  };

  const playToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < trimStart || video.currentTime >= end) video.currentTime = trimStart;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const currentPercent = duration ? ((time - trimStart) / Math.max(0.001, end - trimStart)) * 100 : 0;
  const selectedPercent = selected
    ? ((selected.start - trimStart) / Math.max(0.001, end - trimStart)) * 100
    : 0;
  const selectedWidth = selected
    ? ((selected.end - selected.start) / Math.max(0.001, end - trimStart)) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-[110] bg-black text-white flex flex-col overflow-hidden">
      <header className="h-14 shrink-0 flex items-center justify-between px-3">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Retour"><ArrowLeft size={26} /></button>
        <span className="font-semibold text-sm">Modifier la vidéo</span>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400" aria-label="Terminer"><Check size={27} /></button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
          <video ref={videoRef} src={src} playsInline className="max-h-full max-w-full object-contain" onClick={playToggle} />
        </div>

        <div className="shrink-0 px-3">
          <div className="h-11 flex items-center justify-center gap-6">
            <span className="text-sm tabular-nums">{timeLabel(Math.max(0, time - trimStart))} / {timeLabel(Math.max(0, end - trimStart))}</span>
            <button onClick={playToggle} aria-label={playing ? "Pause" : "Lire"}>{playing ? <Pause size={20} /> : <Play size={20} fill="white" />}</button>
            <button onClick={undo} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler"><Undo2 size={20} /></button>
            <button onClick={redo} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir"><Redo2 size={20} /></button>
            <button onClick={() => videoRef.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19} /></button>
          </div>

          <div className="pb-3">
            <div
              ref={timelineRef}
              className="relative h-[84px] rounded-md bg-white/10 overflow-visible select-none cursor-ew-resize"
              style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
              onPointerDown={onPointerDown}
            >
              <div className="absolute inset-0 flex pointer-events-none overflow-hidden rounded-md">
                {(thumbs.length ? thumbs : Array.from({ length: 18 })).map((frame, i) => (
                  <div key={i} className="flex-1 min-w-0 border-r border-black/30 bg-white/5">
                    {frame && <img src={frame} alt="" draggable={false} className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>

              {removed.map((r, i) => (
                <div key={i} className="absolute inset-y-0 bg-black/75 pointer-events-none z-10" style={{ left: `${((r.start - trimStart) / Math.max(0.001, end - trimStart)) * 100}%`, width: `${((r.end - r.start) / Math.max(0.001, end - trimStart)) * 100}%` }} />
              ))}

              {selected && (
                <div className="absolute inset-y-0 border-2 border-white/80 pointer-events-none z-20" style={{ left: `${selectedPercent}%`, width: `${selectedWidth}%` }} />
              )}

              {splits.map((p) => (
                <div key={p} className="absolute inset-y-0 w-[2px] bg-white/70 pointer-events-none z-30" style={{ left: `${((p - trimStart) / Math.max(0.001, end - trimStart)) * 100}%` }} />
              ))}

              <div className="absolute top-0 bottom-0 w-[3px] bg-white z-40 pointer-events-none shadow" style={{ left: `${currentPercent}%` }} />
              <div className="absolute -top-2 -translate-x-1/2 w-6 h-6 rounded-full bg-white z-50 pointer-events-none shadow" style={{ left: `${currentPercent}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-white/60 mt-1 px-1">
              <span>{timeLabel(trimStart)}</span><span>{timeLabel(end)}</span>
            </div>
            <p className="text-center text-[11px] text-white/55 mt-1">Glisse la ligne blanche avec ton doigt jusqu'à l'endroit exact.</p>
          </div>

          <div className="h-10 border-t border-white/10 flex items-center text-sm text-white/80"><span className="mr-3">♫</span><span>Ajouter un son</span></div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black px-2 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1">
          <button onClick={split} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Diviser"><Scissors size={20} /><span className="text-[11px]">Diviser</span></button>
          <button onClick={deleteSelected} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer le clip sélectionné"><Trash2 size={20} /><span className="text-[11px]">Supprimer</span></button>
          <button onClick={deleteBefore} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer avant"><span className="text-lg leading-none">◀</span><span className="text-[11px]">Avant</span></button>
          <button onClick={deleteAfter} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer après"><span className="text-lg leading-none">▶</span><span className="text-[11px]">Après</span></button>
        </div>
      </div>
    </div>
  );
}
