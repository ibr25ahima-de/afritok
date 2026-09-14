import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Range = { start: number; end: number };
type DragMode = "cursor" | "start" | "end";
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

const fmt = (v: number) => {
  const s = Math.max(0, Math.floor(v));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function ClipEditorFixed({
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode | null>(null);
  const pointerRef = useRef<number | null>(null);
  const [time, setTime] = useState(trimStart);
  const [playing, setPlaying] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [splits, setSplits] = useState<number[]>([]);
  const [selected, setSelected] = useState<Range | null>(null);
  const [history, setHistory] = useState<{ cuts: Range[]; splits: number[]; start: number; end: number }[]>([]);
  const [future, setFuture] = useState<{ cuts: Range[]; splits: number[]; start: number; end: number }[]>([]);
  const end = trimEnd || duration;

  const removed = useMemo(() => [...cuts].sort((a, b) => a.start - b.start), [cuts]);
  const points = useMemo(
    () => [trimStart, ...splits.filter((p) => p > trimStart + 0.05 && p < end - 0.05), end].sort((a, b) => a - b),
    [trimStart, end, splits],
  );
  const clips = useMemo(() => {
    const out: Range[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (b - a < 0.05) continue;
      if (!removed.some((r) => a >= r.start - 0.02 && b <= r.end + 0.02)) out.push({ start: a, end: b });
    }
    return out;
  }, [points, removed]);

  const save = () => {
    setHistory((h) => [
      ...h.slice(-19),
      { cuts: cuts.map((x) => ({ ...x })), splits: [...splits], start: trimStart, end },
    ]);
    setFuture([]);
  };

  const go = (value: number) => {
    const value2 = Math.max(trimStart, Math.min(value, end));
    const blocked = removed.find((r) => value2 >= r.start && value2 < r.end);
    const target = blocked ? Math.min(blocked.end + 0.001, end) : value2;
    if (videoRef.current && Math.abs(videoRef.current.currentTime - target) > 0.01) {
      videoRef.current.currentTime = target;
    }
    setTime(target);
    onCurrentTimeChange?.(target);
  };

  const fromX = (x: number) => {
    const el = timelineRef.current;
    if (!el || duration <= 0) return trimStart;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return trimStart;
    const ratio = Math.max(0, Math.min(1, (x - r.left) / r.width));
    return ratio * duration;
  };

  const scrubAt = (clientX: number, mode: DragMode) => {
    const v = fromX(clientX);
    if (mode === "cursor") {
      go(v);
      return;
    }
    if (mode === "start") {
      const n = Math.min(Math.max(0, v), end - 0.1);
      onTrimChange(n, end);
      go(n);
      return;
    }
    const n = Math.max(trimStart + 0.1, Math.min(v, duration));
    onTrimChange(trimStart, n);
    go(n);
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    pointerRef.current = event.pointerId;
    dragRef.current = mode;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (videoRef.current?.played.length) videoRef.current.pause();
    scrubAt(event.clientX, mode);
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragRef.current) return;
      scrubAt(event.clientX, dragRef.current);
    };
    const up = () => {
      dragRef.current = null;
      pointerRef.current = null;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [duration, trimStart, end, removed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const loaded = () => {
      v.currentTime = trimStart;
      setTime(trimStart);
    };
    const tick = () => {
      const t = v.currentTime;
      const cut = removed.find((r) => t >= r.start && t < r.end);
      if (cut) {
        v.currentTime = Math.min(cut.end + 0.001, end);
        return;
      }
      if (t >= end - 0.03) {
        v.pause();
        setPlaying(false);
        return;
      }
      if (t >= trimStart) {
        setTime(t);
        onCurrentTimeChange?.(t);
      }
    };
    const p = () => setPlaying(true);
    const q = () => setPlaying(false);
    v.addEventListener("loadedmetadata", loaded);
    v.addEventListener("timeupdate", tick);
    v.addEventListener("play", p);
    v.addEventListener("pause", q);
    return () => {
      v.removeEventListener("loadedmetadata", loaded);
      v.removeEventListener("timeupdate", tick);
      v.removeEventListener("play", p);
      v.removeEventListener("pause", q);
    };
  }, [src, trimStart, end, removed, onCurrentTimeChange]);

  useEffect(() => {
    let cancelled = false;
    const v = document.createElement("video");
    v.src = src;
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    const wait = () =>
      new Promise<void>((resolve, reject) => {
        if (v.readyState >= 1) return resolve();
        const ok = () => {
          clean();
          resolve();
        };
        const bad = () => {
          clean();
          reject(new Error());
        };
        const clean = () => {
          v.removeEventListener("loadedmetadata", ok);
          v.removeEventListener("error", bad);
        };
        v.addEventListener("loadedmetadata", ok, { once: true });
        v.addEventListener("error", bad, { once: true });
      });
    const seek = (t: number) =>
      new Promise<void>((resolve) => {
        let done = false;
        const f = () => {
          if (done) return;
          done = true;
          v.removeEventListener("seeked", f);
          resolve();
        };
        v.addEventListener("seeked", f, { once: true });
        v.currentTime = t;
        setTimeout(f, 600);
      });
    (async () => {
      try {
        await wait();
        const c = document.createElement("canvas");
        c.width = 240;
        c.height = 135;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        const out: string[] = [];
        const total = v.duration || duration;
        for (let i = 0; i < 18; i++) {
          if (cancelled) return;
          await seek(total * i / 17);
          ctx.drawImage(v, 0, 0, c.width, c.height);
          out.push(c.toDataURL("image/jpeg", 0.58));
        }
        if (!cancelled) setThumbs(out);
      } catch {
        // Thumbnail generation is optional; the interactive timeline still works without it.
      }
    })();
    return () => {
      cancelled = true;
      v.removeAttribute("src");
      v.load();
    };
  }, [src, duration]);

  const splitHere = () => {
    const clip = clips.find((c) => time >= c.start - 0.01 && time <= c.end + 0.01);
    if (!clip || time <= clip.start + 0.08 || time >= clip.end - 0.08) {
      toast.info("Déplace la ligne blanche exactement à l'endroit de la coupe");
      return;
    }
    if (splits.some((p) => Math.abs(p - time) < 0.08)) {
      toast.info("La vidéo est déjà divisée ici");
      return;
    }
    save();
    setSplits((p) => [...p, time].sort((a, b) => a - b));
    setSelected({ start: clip.start, end: time });
    toast.success("Vidéo divisée");
  };

  const deleteSelected = () => {
    const clip = selected || clips.find((c) => time >= c.start && time < c.end);
    if (!clip) {
      toast.info("Sélectionne une partie de la vidéo");
      return;
    }
    if (clips.length <= 1) {
      toast.info("Garder au moins 1 clip");
      return;
    }
    save();
    onCutsChange([...cuts, { start: clip.start, end: clip.end }]);
    setSplits((p) => p.filter((x) => Math.abs(x - clip.start) > 0.05 && Math.abs(x - clip.end) > 0.05));
    const next = clips.find((c) => c.start > clip.end + 0.02) || clips.find((c) => c.end < clip.start - 0.02) || null;
    setSelected(next);
    go(next?.start ?? trimStart);
    toast.success("Partie supprimée");
  };

  const deleteBefore = () => {
    if (time <= trimStart + 0.05) {
      toast.info("Déplace la ligne blanche vers la droite");
      return;
    }
    save();
    onTrimChange(time, end);
    onCutsChange(cuts.filter((c) => c.end > time));
    setSplits((p) => p.filter((x) => x > time + 0.05));
    go(time);
    toast.success("Partie avant supprimée");
  };

  const deleteAfter = () => {
    if (time >= end - 0.05) {
      toast.info("Déplace la ligne blanche vers la gauche");
      return;
    }
    save();
    onTrimChange(trimStart, time);
    onCutsChange(cuts.filter((c) => c.start < time));
    setSplits((p) => p.filter((x) => x < time - 0.05));
    go(Math.max(trimStart, time - 0.02));
    toast.success("Partie après supprimée");
  };

  const undo = () => {
    const h = history.at(-1);
    if (!h) return;
    setFuture((f) => [...f, { cuts: cuts.map((x) => ({ ...x })), splits: [...splits], start: trimStart, end }]);
    setHistory((hs) => hs.slice(0, -1));
    onCutsChange(h.cuts);
    onTrimChange(h.start, h.end);
    setSplits(h.splits);
    setSelected(null);
    go(h.start);
  };

  const redo = () => {
    const h = future.at(-1);
    if (!h) return;
    setHistory((hs) => [...hs, { cuts: cuts.map((x) => ({ ...x })), splits: [...splits], start: trimStart, end }]);
    setFuture((fs) => fs.slice(0, -1));
    onCutsChange(h.cuts);
    onTrimChange(h.start, h.end);
    setSplits(h.splits);
    setSelected(null);
    go(h.start);
  };

  const playToggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const head = duration ? time / duration * 100 : 0;
  const left = duration ? trimStart / duration * 100 : 0;
  const right = duration ? end / duration * 100 : 100;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden">
      <header className="h-14 shrink-0 flex items-center justify-between px-3">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Retour"><ArrowLeft size={26} /></button>
        <span className="font-semibold text-sm">Modifier</span>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400" aria-label="Terminer"><Check size={27} /></button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
          <video ref={videoRef} src={src} playsInline className="max-h-full max-w-full object-contain" onClick={playToggle} />
        </div>

        <div className="shrink-0 px-3">
          <div className="h-11 flex items-center justify-center gap-6 text-white/85">
            <span className="text-sm tabular-nums">{fmt(time)} / {fmt(Math.max(0, end - trimStart))}</span>
            <button onClick={playToggle} aria-label={playing ? "Pause" : "Lire"}>{playing ? <Pause size={20} /> : <Play size={20} fill="white" />}</button>
            <button onClick={undo} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler la dernière coupe"><Undo2 size={20} /></button>
            <button onClick={redo} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir la dernière coupe"><Redo2 size={20} /></button>
            <button onClick={() => videoRef.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19} /></button>
          </div>

          <div className="pb-3">
            <div
              ref={timelineRef}
              className="relative h-[82px] rounded-md bg-white/10 select-none overflow-visible"
              style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const t = fromX(e.clientX);
                const clip = clips.find((c) => t >= c.start && t < c.end);
                setSelected(clip || null);
                beginDrag(e, "cursor");
              }}
              onPointerUp={(e) => {
                if (pointerRef.current === e.pointerId) {
                  e.currentTarget.releasePointerCapture?.(e.pointerId);
                  dragRef.current = null;
                  pointerRef.current = null;
                }
              }}
              onPointerCancel={() => {
                dragRef.current = null;
                pointerRef.current = null;
              }}
            >
              <div className="absolute inset-0 flex pointer-events-none">
                {(thumbs.length ? thumbs : Array.from({ length: 18 })).map((t, i) => (
                  <div key={i} className="flex-1 min-w-0 border-r border-black/25">
                    {t && <img src={t} alt="" draggable={false} className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>

              {activeCuts(removed, duration).map((r, i) => (
                <div key={i} className="absolute inset-y-0 bg-black/75 pointer-events-none" style={{ left: `${r.start / duration * 100}%`, width: `${(r.end - r.start) / duration * 100}%` }} />
              ))}

              {clips.map((c, i) => {
                const is = selected && Math.abs(selected.start - c.start) < 0.03 && Math.abs(selected.end - c.end) < 0.03;
                return <div key={i} className={`absolute inset-y-0 border-2 pointer-events-none ${is ? "border-white" : "border-transparent"}`} style={{ left: `${c.start / duration * 100}%`, width: `${(c.end - c.start) / duration * 100}%` }} />;
              })}

              {splits.map((p) => <div key={p} className="absolute top-0 bottom-0 w-[2px] bg-white/90 z-20 pointer-events-none" style={{ left: `${p / duration * 100}%` }} />)}

              <div className="absolute top-0 bottom-0 w-[3px] bg-white z-30 pointer-events-none" style={{ left: `${head}%` }} />
              <div className="absolute -top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-white z-40 pointer-events-none shadow" style={{ left: `${head}%` }} />

              <button
                type="button"
                aria-label="Début de la vidéo"
                className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-50 bg-white rounded-l-md cursor-ew-resize"
                style={{ left: `${left}%`, touchAction: "none" }}
                onPointerDown={(e) => beginDrag(e, "start")}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture?.(e.pointerId);
                  dragRef.current = null;
                  pointerRef.current = null;
                }}
              />

              <button
                type="button"
                aria-label="Fin de la vidéo"
                className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-50 bg-white rounded-r-md cursor-ew-resize"
                style={{ left: `${right}%`, touchAction: "none" }}
                onPointerDown={(e) => beginDrag(e, "end")}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture?.(e.pointerId);
                  dragRef.current = null;
                  pointerRef.current = null;
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-white/60 mt-1 px-1"><span>{fmt(trimStart)}</span><span>{fmt(end)}</span></div>
          </div>

          <div className="h-10 border-t border-white/10 flex items-center text-sm text-white/80">
            <span className="mr-3">♫</span><span>Ajouter un son</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black px-2 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button onClick={splitHere} className="min-w-[78px] flex flex-col items-center gap-1 text-xs"><Scissors size={21} /><span>Diviser</span></button>
          <button onClick={deleteSelected} className="min-w-[86px] flex flex-col items-center gap-1 text-xs"><Trash2 size={21} /><span>Supprimer</span></button>
          <button onClick={deleteBefore} className="min-w-[100px] flex flex-col items-center gap-1 text-xs"><span className="text-lg">◀</span><span>Supprimer avant</span></button>
          <button onClick={deleteAfter} className="min-w-[100px] flex flex-col items-center gap-1 text-xs"><span className="text-lg">▶</span><span>Supprimer après</span></button>
        </div>
      </div>
    </div>
  );
}

function activeCuts(cuts: Range[], duration: number) {
  return cuts
    .map((c) => ({ start: Math.max(0, c.start), end: Math.min(duration, c.end) }))
    .filter((c) => c.end > c.start + 0.02);
}
