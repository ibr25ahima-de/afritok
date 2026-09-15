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

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(n, b));
const label = (v: number) => {
  const s = Math.max(0, Math.floor(v));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const merge = (ranges: Range[]) =>
  ranges
    .filter((r) => r.end - r.start > 0.05)
    .sort((a, b) => a.start - b.start)
    .reduce<Range[]>((out, r) => {
      const last = out[out.length - 1];
      if (last && r.start <= last.end + 0.03) last.end = Math.max(last.end, r.end);
      else out.push({ ...r });
      return out;
    }, []);

export function ClipEditorTouch({
  src,
  duration,
  trimStart,
  trimEnd,
  cuts,
  onTrimChange,
  onCutsChange,
  onCurrentTimeChange,
  onClose,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const timeline = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const timeRef = useRef(trimStart);
  const startRef = useRef(trimStart);
  const endRef = useRef(trimEnd > 0 ? trimEnd : duration);
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
    () => [trimStart, ...splits.filter((x) => x > trimStart + 0.05 && x < end - 0.05), end].sort((a, b) => a - b),
    [trimStart, end, splits]
  );
  const clips = useMemo(
    () =>
      boundaries
        .slice(0, -1)
        .map((a, i) => ({ start: a, end: boundaries[i + 1] }))
        .filter((c) => c.end - c.start > 0.05 && !removed.some((r) => c.start >= r.start - 0.02 && c.end <= r.end + 0.02)),
    [boundaries, removed]
  );

  useEffect(() => {
    timeRef.current = time;
    startRef.current = trimStart;
    endRef.current = end;
  }, [time, trimStart, end]);

  const seek = (raw: number) => {
    const safe = clamp(raw, startRef.current, endRef.current);
    const removedRange = removed.find((r) => safe >= r.start && safe < r.end);
    const target = removedRange ? clamp(removedRange.end + 0.001, startRef.current, endRef.current) : safe;
    timeRef.current = target;
    setTime(target);
    onCurrentTimeChange?.(target);
    if (video.current && Math.abs(video.current.currentTime - target) > 0.003) {
      video.current.currentTime = target;
    }
  };

  // This is the important part: native touch listeners with passive:false.
  // They work directly on Android/iPhone and do not depend on React re-renders.
  useEffect(() => {
    const el = timeline.current;
    if (!el) return;

    const positionToTime = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return timeRef.current;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return startRef.current + ratio * (endRef.current - startRef.current);
    };

    const start = (clientX: number) => {
      dragging.current = true;
      video.current?.pause();
      setPlaying(false);
      seek(positionToTime(clientX));
    };

    const move = (clientX: number) => {
      if (!dragging.current) return;
      seek(positionToTime(clientX));
    };

    const stop = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const t = timeRef.current;
      const clip = clips.find((c) => t >= c.start - 0.01 && t <= c.end + 0.01);
      if (clip) setSelected(clip);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches.length) return;
      e.preventDefault();
      start(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !e.touches.length) return;
      e.preventDefault();
      move(e.touches[0].clientX);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stop();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      e.preventDefault();
      start(e.clientX);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!dragging.current) return;
      e.preventDefault();
      move(e.clientX);
    };
    const onPointerUp = () => stop();

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    el.addEventListener("pointerdown", onPointerDown, { passive: false });
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [clips, removed]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const tick = () => {
      const t = v.currentTime;
      const removedRange = removed.find((r) => t >= r.start && t < r.end);
      if (removedRange) {
        v.currentTime = clamp(removedRange.end + 0.001, trimStart, end);
        return;
      }
      if (t >= end - 0.03) {
        v.pause();
        setPlaying(false);
        timeRef.current = end;
        setTime(end);
        return;
      }
      if (!dragging.current && t >= trimStart) {
        timeRef.current = t;
        setTime(t);
        onCurrentTimeChange?.(t);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", tick);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", tick);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [trimStart, end, removed, onCurrentTimeChange]);

  useEffect(() => {
    let dead = false;
    const v = document.createElement("video");
    v.src = src;
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    const ready = () =>
      new Promise<void>((resolve) => {
        if (v.readyState >= 1) return resolve();
        v.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
    const seekFrame = (t: number) =>
      new Promise<void>((resolve) => {
        const done = () => {
          v.removeEventListener("seeked", done);
          resolve();
        };
        v.addEventListener("seeked", done, { once: true });
        v.currentTime = t;
        setTimeout(done, 500);
      });
    (async () => {
      try {
        await ready();
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 135;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const out: string[] = [];
        for (let i = 0; i < 18; i++) {
          if (dead) return;
          await seekFrame((v.duration || duration) * i / 17);
          ctx.drawImage(v, 0, 0, 240, 135);
          out.push(canvas.toDataURL("image/jpeg", 0.55));
        }
        if (!dead) setThumbs(out);
      } catch {
        // The video itself remains usable even if thumbnails cannot be generated.
      }
    })();
    return () => {
      dead = true;
      v.removeAttribute("src");
      v.load();
    };
  }, [src, duration]);

  const remember = () => {
    setHistory((h) => [
      ...h.slice(-19),
      { cuts: cuts.map((r) => ({ ...r })), splits: [...splits], start: trimStart, end },
    ]);
    setFuture([]);
  };

  const selectAt = (t: number) => {
    const c = clips.find((x) => t >= x.start - 0.01 && t <= x.end + 0.01);
    if (c) setSelected(c);
  };

  const split = () => {
    const t = timeRef.current;
    const c = clips.find((x) => t > x.start + 0.08 && t < x.end - 0.08);
    if (!c) return toast.info("Place la ligne blanche à l'endroit de la coupe");
    if (splits.some((x) => Math.abs(x - t) < 0.08)) return toast.info("La vidéo est déjà divisée ici");
    remember();
    setSplits((s) => [...s, t].sort((a, b) => a - b));
    setSelected(null);
    toast.success(`Vidéo divisée à ${label(t)}`);
  };

  const del = () => {
    const t = timeRef.current;
    const c = selected || clips.find((x) => t >= x.start && t <= x.end);
    if (!c) return toast.info("Sélectionne la partie à supprimer");
    if (clips.length <= 1) return toast.info("Garder au moins 1 clip");
    remember();
    onCutsChange(merge([...cuts, c]));
    setSplits((s) => s.filter((x) => x < c.start - 0.05 || x > c.end + 0.05));
    setSelected(null);
    seek(clips.find((x) => x.start > c.end + 0.02)?.start ?? trimStart);
    toast.success("Partie supprimée");
  };

  const before = () => {
    const t = timeRef.current;
    if (t <= trimStart + 0.05) return toast.info("Déplace la ligne vers la droite");
    remember();
    onTrimChange(t, end);
    onCutsChange(cuts.filter((r) => r.end > t));
    setSplits((s) => s.filter((x) => x > t + 0.05));
    seek(t);
    toast.success("Début supprimé");
  };

  const after = () => {
    const t = timeRef.current;
    if (t >= end - 0.05) return toast.info("Déplace la ligne vers la gauche");
    remember();
    onTrimChange(trimStart, t);
    onCutsChange(cuts.filter((r) => r.start < t));
    setSplits((s) => s.filter((x) => x < t - 0.05));
    seek(t - 0.01);
    toast.success("Fin supprimée");
  };

  const undo = () => {
    const h = history[history.length - 1];
    if (!h) return;
    setFuture((f) => [...f, { cuts: cuts.map((r) => ({ ...r })), splits: [...splits], start: trimStart, end }]);
    setHistory((x) => x.slice(0, -1));
    onCutsChange(h.cuts);
    onTrimChange(h.start, h.end);
    setSplits(h.splits);
    setSelected(null);
    seek(h.start);
  };

  const redo = () => {
    const h = future[future.length - 1];
    if (!h) return;
    setHistory((x) => [...x, { cuts: cuts.map((r) => ({ ...r })), splits: [...splits], start: trimStart, end }]);
    setFuture((x) => x.slice(0, -1));
    onCutsChange(h.cuts);
    onTrimChange(h.start, h.end);
    setSplits(h.splits);
    setSelected(null);
    seek(h.start);
  };

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < trimStart || v.currentTime >= end) v.currentTime = trimStart;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const pct = ((time - trimStart) / Math.max(0.001, end - trimStart)) * 100;
  const selectedLeft = selected ? ((selected.start - trimStart) / Math.max(0.001, end - trimStart)) * 100 : 0;
  const selectedWidth = selected ? ((selected.end - selected.start) / Math.max(0.001, end - trimStart)) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[110] bg-black text-white flex flex-col overflow-hidden">
      <header className="h-14 shrink-0 flex items-center justify-between px-3">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={26} />
        </button>
        <span className="font-semibold text-sm">Modifier la vidéo</span>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400" aria-label="Terminer">
          <Check size={27} />
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
          <video ref={video} src={src} playsInline className="max-h-full max-w-full object-contain" onClick={toggle} />
        </div>

        <div className="shrink-0 px-3">
          <div className="h-11 flex items-center justify-center gap-6">
            <span className="text-sm tabular-nums">{label(Math.max(0, time - trimStart))} / {label(Math.max(0, end - trimStart))}</span>
            <button onClick={toggle} aria-label={playing ? "Pause" : "Lire"}>{playing ? <Pause size={20} /> : <Play size={20} fill="white" />}</button>
            <button onClick={undo} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler"><Undo2 size={20} /></button>
            <button onClick={redo} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir"><Redo2 size={20} /></button>
            <button onClick={() => video.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19} /></button>
          </div>

          <div className="pb-3">
            <div
              ref={timeline}
              className="relative h-[84px] rounded-md bg-white/10 overflow-visible select-none"
              style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
            >
              <div className="absolute inset-0 flex pointer-events-none overflow-hidden rounded-md">
                {(thumbs.length ? thumbs : Array.from({ length: 18 })).map((f, i) => (
                  <div key={i} className="flex-1 min-w-0 border-r border-black/30 bg-white/5">
                    {f && <img src={f} alt="" draggable={false} className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>

              {removed.map((r, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 bg-black/75 pointer-events-none z-10"
                  style={{
                    left: `${((r.start - trimStart) / Math.max(0.001, end - trimStart)) * 100}%`,
                    width: `${((r.end - r.start) / Math.max(0.001, end - trimStart)) * 100}%`,
                  }}
                />
              ))}

              {selected && (
                <div
                  className="absolute inset-y-0 border-2 border-white/80 pointer-events-none z-20"
                  style={{ left: `${selectedLeft}%`, width: `${selectedWidth}%` }}
                />
              )}

              {splits.map((x) => (
                <div
                  key={x}
                  className="absolute inset-y-0 w-[2px] bg-white/70 pointer-events-none z-30"
                  style={{ left: `${((x - trimStart) / Math.max(0.001, end - trimStart)) * 100}%` }}
                />
              ))}

              <div
                className="absolute top-0 bottom-0 w-[3px] bg-white z-40 pointer-events-none shadow"
                style={{ left: `${pct}%` }}
              />
              <div
                className="absolute -top-2 -translate-x-1/2 w-6 h-6 rounded-full bg-white z-50 pointer-events-none shadow"
                style={{ left: `${pct}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-white/60 mt-1 px-1">
              <span>{label(trimStart)}</span>
              <span>{label(end)}</span>
            </div>
          </div>

          <div className="h-10 border-t border-white/10 flex items-center text-sm text-white/80">
            <span className="mr-3">♫</span>
            <span>Ajouter un son</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black px-2 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1">
          <button onClick={split} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Diviser">
            <Scissors size={20} /><span className="text-[11px]">Diviser</span>
          </button>
          <button onClick={del} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer">
            <Trash2 size={20} /><span className="text-[11px]">Supprimer</span>
          </button>
          <button onClick={before} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer avant">
            <span className="text-lg leading-none">◀</span><span className="text-[11px]">Avant</span>
          </button>
          <button onClick={after} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer après">
            <span className="text-lg leading-none">▶</span><span className="text-[11px]">Après</span>
          </button>
        </div>
      </div>
    </div>
  );
}
