import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUpload } from "@/contexts/UploadContext";

type Range = { start: number; end: number };
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

const fmt = (value: number) => {
  const s = Math.max(0, Math.floor(value));
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
  const { setFile } = useUpload();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(trimStart);
  const [playing, setPlaying] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [selectedClip, setSelectedClip] = useState<Range | null>(null);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [dragMode, setDragMode] = useState<"playhead" | "start" | "end" | null>(null);
  const [history, setHistory] = useState<{ cuts: Range[]; splits: number[]; start: number; end: number }[]>([]);
  const [future, setFuture] = useState<{ cuts: Range[]; splits: number[]; start: number; end: number }[]>([]);

  const end = trimEnd || duration;

  const activeCuts = useMemo(() => {
    const sorted = [...cuts].sort((a, b) => a.start - b.start);
    const merged: Range[] = [];
    for (const item of sorted) {
      const start = Math.max(trimStart, item.start);
      const finish = Math.min(end, item.end);
      if (finish <= start + 0.02) continue;
      const last = merged[merged.length - 1];
      if (last && start <= last.end + 0.03) last.end = Math.max(last.end, finish);
      else merged.push({ start, end: finish });
    }
    return merged;
  }, [cuts, trimStart, end]);

  const points = useMemo(() => {
    const values = [trimStart, ...splitPoints.filter(p => p > trimStart + 0.05 && p < end - 0.05), end]
      .sort((a, b) => a - b);
    return values.filter((v, i) => i === 0 || v - values[i - 1] > 0.05);
  }, [splitPoints, trimStart, end]);

  const clips = useMemo(() => {
    const result: Range[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const finish = points[i + 1];
      if (finish - start < 0.05) continue;
      if (!activeCuts.some(c => start >= c.start - 0.02 && finish <= c.end + 0.02)) {
        result.push({ start, end: finish });
      }
    }
    return result;
  }, [points, activeCuts]);

  const snapshot = () => ({
    cuts: cuts.map(c => ({ ...c })),
    splits: [...splitPoints],
    start: trimStart,
    end,
  });

  const remember = () => {
    setHistory(h => [...h.slice(-19), snapshot()]);
    setFuture([]);
  };

  const setVideoTime = (value: number) => {
    const clamped = Math.max(trimStart, Math.min(value, end));
    const removed = activeCuts.find(c => clamped >= c.start && clamped < c.end);
    const target = removed ? Math.min(removed.end + 0.001, end) : clamped;
    if (videoRef.current) videoRef.current.currentTime = target;
    setTime(target);
    onCurrentTimeChange?.(target);
  };

  const timeFromClientX = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || duration <= 0) return trimStart;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  // IMPORTANT: the timeline itself is touch-draggable. There is no horizontal scroll.
  const beginDrag = (mode: "playhead" | "start" | "end", clientX: number) => {
    setDragMode(mode);
    const value = timeFromClientX(clientX);
    if (mode === "playhead") {
      setVideoTime(value);
    } else if (mode === "start") {
      const next = Math.max(0, Math.min(value, end - 0.1));
      onTrimChange(next, end);
      setVideoTime(next);
    } else {
      const next = Math.max(trimStart + 0.1, Math.min(value, duration));
      onTrimChange(trimStart, next);
      setVideoTime(Math.min(next, end));
    }
  };

  const moveDrag = (clientX: number) => {
    if (!dragMode) return;
    const value = timeFromClientX(clientX);
    if (dragMode === "playhead") {
      setVideoTime(value);
    } else if (dragMode === "start") {
      const next = Math.max(0, Math.min(value, end - 0.1));
      onTrimChange(next, end);
      setVideoTime(next);
    } else {
      const next = Math.max(trimStart + 0.1, Math.min(value, duration));
      onTrimChange(trimStart, next);
      setVideoTime(next);
    }
  };

  useEffect(() => {
    const move = (event: PointerEvent) => moveDrag(event.clientX);
    const up = () => setDragMode(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const loaded = () => {
      video.currentTime = Math.max(0, trimStart);
    };
    const tick = () => {
      const current = video.currentTime;
      const removed = activeCuts.find(c => current >= c.start && current < c.end);
      if (removed) {
        video.currentTime = Math.min(removed.end + 0.001, end);
        return;
      }
      if (current >= end - 0.03) {
        video.pause();
        setPlaying(false);
        return;
      }
      if (current >= trimStart) {
        setTime(current);
        onCurrentTimeChange?.(current);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("loadedmetadata", loaded);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("loadedmetadata", loaded);
      video.removeEventListener("timeupdate", tick);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [src, trimStart, end, activeCuts, onCurrentTimeChange]);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const wait = () => new Promise<void>((resolve, reject) => {
      if (video.readyState >= 1) return resolve();
      const ok = () => { cleanup(); resolve(); };
      const bad = () => { cleanup(); reject(new Error("video")); };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", ok);
        video.removeEventListener("error", bad);
      };
      video.addEventListener("loadedmetadata", ok, { once: true });
      video.addEventListener("error", bad, { once: true });
    });
    const seek = (t: number) => new Promise<void>(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener("seeked", finish);
        resolve();
      };
      video.addEventListener("seeked", finish, { once: true });
      video.currentTime = t;
      window.setTimeout(finish, 700);
    });
    const makeThumbs = async () => {
      try {
        await wait();
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 135;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const total = video.duration || duration;
        const result: string[] = [];
        for (let i = 0; i < 18; i++) {
          if (cancelled) return;
          await seek(total * i / 17);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          result.push(canvas.toDataURL("image/jpeg", 0.58));
        }
        if (!cancelled) setThumbs(result);
      } catch {}
    };
    void makeThumbs();
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, duration]);

  const splitHere = () => {
    const clip = clips.find(c => time >= c.start - 0.01 && time <= c.end + 0.01);
    if (!clip || time <= clip.start + 0.08 || time >= clip.end - 0.08) {
      toast.info("Déplace la ligne blanche exactement à l'endroit de la coupe");
      return;
    }
    if (splitPoints.some(p => Math.abs(p - time) < 0.08)) {
      toast.info("La vidéo est déjà divisée ici");
      return;
    }
    remember();
    setSplitPoints(p => [...p, time].sort((a, b) => a - b));
    setSelectedClip({ start: clip.start, end: time });
    toast.success("Vidéo divisée");
  };

  const deleteSelected = () => {
    const clip = selectedClip || clips.find(c => time >= c.start && time < c.end);
    if (!clip) {
      toast.info("Sélectionne d'abord la partie à supprimer");
      return;
    }
    if (clips.length <= 1) {
      toast.info("Garder au moins 1 clip");
      return;
    }
    remember();
    onCutsChange([...cuts, { start: clip.start, end: clip.end }]);
    setSplitPoints(p => p.filter(x => Math.abs(x - clip.start) > 0.05 && Math.abs(x - clip.end) > 0.05));
    const next = clips.find(c => c.start > clip.end + 0.02) || clips.find(c => c.end < clip.start - 0.02) || null;
    setSelectedClip(next);
    setVideoTime(next?.start ?? trimStart);
    toast.success("Partie supprimée");
  };

  const deleteBefore = () => {
    if (time <= trimStart + 0.05) return toast.info("Déplace la ligne blanche vers la droite");
    remember();
    onTrimChange(time, end);
    onCutsChange(cuts.filter(c => c.end > time));
    setSplitPoints(p => p.filter(x => x > time + 0.05));
    setVideoTime(time);
    toast.success("Partie avant supprimée");
  };

  const deleteAfter = () => {
    if (time >= end - 0.05) return toast.info("Déplace la ligne blanche vers la gauche");
    remember();
    onTrimChange(trimStart, time);
    onCutsChange(cuts.filter(c => c.start < time));
    setSplitPoints(p => p.filter(x => x < time - 0.05));
    setVideoTime(Math.max(trimStart, time - 0.02));
    toast.success("Partie après supprimée");
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture(f => [...f, snapshot()]);
    setHistory(h => h.slice(0, -1));
    onCutsChange(previous.cuts);
    onTrimChange(previous.start, previous.end);
    setSplitPoints(previous.splits);
    setSelectedClip(null);
    setVideoTime(previous.start);
  };

  const redo = () => {
    const next = future[future.length - 1];
    if (!next) return;
    setHistory(h => [...h, snapshot()]);
    setFuture(f => f.slice(0, -1));
    onCutsChange(next.cuts);
    onTrimChange(next.start, next.end);
    setSplitPoints(next.splits);
    setSelectedClip(null);
    setVideoTime(next.start);
  };

  const playToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const playhead = duration > 0 ? Math.max(0, Math.min(100, time / duration * 100)) : 0;
  const leftTrim = duration > 0 ? trimStart / duration * 100 : 0;
  const rightTrim = duration > 0 ? end / duration * 100 : 100;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden">
      <header className="h-14 shrink-0 flex items-center justify-between px-3">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Retour"><ArrowLeft size={26} /></button>
        <span className="font-semibold text-sm">Modifier</span>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400" aria-label="Terminer"><Check size={27} /></button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2">
          <video
            ref={videoRef}
            src={src}
            playsInline
            className="max-h-full max-w-full object-contain"
            onClick={playToggle}
          />
        </div>

        <div className="shrink-0 px-3">
          <div className="h-11 flex items-center justify-center gap-6 text-white/85">
            <span className="text-sm tabular-nums">{fmt(time)} / {fmt(Math.max(0, end - trimStart))}</span>
            <button onClick={playToggle} aria-label="Lecture">{playing ? <Pause size={20} /> : <Play size={20} fill="white" />}</button>
            <button onClick={undo} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler"><Undo2 size={20} /></button>
            <button onClick={redo} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir"><Redo2 size={20} /></button>
            <button onClick={() => videoRef.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19} /></button>
          </div>

          <div className="pb-3">
            <div
              ref={timelineRef}
              className="relative h-[76px] rounded-md overflow-visible select-none touch-none bg-white/10"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                beginDrag("playhead", e.clientX);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture?.(e.pointerId)) moveDrag(e.clientX);
              }}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
                setDragMode(null);
              }}
              onPointerCancel={() => setDragMode(null)}
            >
              <div className="absolute inset-0 flex pointer-events-none">
                {(thumbs.length ? thumbs : Array.from({ length: 18 })).map((thumb, i) => (
                  <div key={i} className="flex-1 min-w-0 border-r border-black/25">
                    {thumb && <img src={thumb} alt="" draggable={false} className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>

              {activeCuts.map((cut, i) => (
                <div key={`${cut.start}-${cut.end}-${i}`} className="absolute inset-y-0 bg-black/75 pointer-events-none" style={{ left: `${cut.start / duration * 100}%`, width: `${(cut.end - cut.start) / duration * 100}%` }} />
              ))}

              <div className="absolute top-0 bottom-0 w-[3px] bg-white z-20 pointer-events-none" style={{ left: `${playhead}%` }} />
              <div className="absolute -top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-white z-30 pointer-events-none" style={{ left: `${playhead}%` }} />

              <button
                type="button"
                aria-label="Début de la vidéo"
                className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-40 cursor-ew-resize bg-white rounded-l-md"
                style={{ left: `${leftTrim}%`, touchAction: "none" }}
                onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); setDragMode("start"); }}
                onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) moveDrag(e.clientX); }}
                onPointerUp={() => setDragMode(null)}
              />

              <button
                type="button"
                aria-label="Fin de la vidéo"
                className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-40 cursor-ew-resize bg-white rounded-r-md"
                style={{ left: `${rightTrim}%`, touchAction: "none" }}
                onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); setDragMode("end"); }}
                onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) moveDrag(e.clientX); }}
                onPointerUp={() => setDragMode(null)}
              />

              {clips.map((clip, index) => {
                const selected = selectedClip && Math.abs(selectedClip.start - clip.start) < 0.03 && Math.abs(selectedClip.end - clip.end) < 0.03;
                return (
                  <button
                    key={`${clip.start}-${clip.end}-${index}`}
                    type="button"
                    aria-label={`Clip ${index + 1}`}
                    className={`absolute top-0 bottom-0 z-10 border-2 ${selected ? "border-white" : "border-transparent"}`}
                    style={{ left: `${clip.start / duration * 100}%`, width: `${(clip.end - clip.start) / duration * 100}%`, touchAction: "none" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedClip(clip);
                      setVideoTime(clip.start);
                    }}
                  />
                );
              })}
            </div>

            <div className="flex justify-between text-[11px] text-white/60 mt-1 px-1">
              <span>{fmt(trimStart)}</span>
              <span>{fmt(end)}</span>
            </div>
          </div>

          <div className="h-10 border-t border-white/10 flex items-center text-sm text-white/80">
            <span className="mr-3">♫</span><span>Ajouter un son</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black px-2 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button onClick={splitHere} className="min-w-[78px] flex flex-col items-center gap-1 text-xs"><Scissors size={21} /><span>Diviser</span></button>
          <button onClick={deleteSelected} className="min-w-[78px] flex flex-col items-center gap-1 text-xs"><Trash2 size={21} /><span>Supprimer</span></button>
          <button onClick={deleteBefore} className="min-w-[96px] flex flex-col items-center gap-1 text-xs"><span className="text-lg">◀</span><span>Couper avant</span></button>
          <button onClick={deleteAfter} className="min-w-[96px] flex flex-col items-center gap-1 text-xs"><span className="text-lg">▶</span><span>Couper après</span></button>
        </div>
      </div>
    </div>
  );
}
