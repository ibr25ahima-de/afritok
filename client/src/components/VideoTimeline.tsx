import { useEffect, useMemo, useRef, useState } from "react";

type Range = { start: number; end: number };

type VideoTimelineProps = {
  src: string;
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  cuts: Range[];
  onCurrentTimeChange: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
  onCutsChange: (cuts: Range[]) => void;
  onDurationChange?: (duration: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const mergeRanges = (ranges: Range[]) => {
  const sorted = [...ranges]
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) merged.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  }
  return merged;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "00:00";
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export function VideoTimeline({
  src,
  currentTime,
  duration,
  trimStart,
  trimEnd,
  cuts,
  onCurrentTimeChange,
  onTrimChange,
  onCutsChange,
  onDurationChange,
}: VideoTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [dragging, setDragging] = useState<"playhead" | "start" | "end" | null>(null);

  const safeDuration = Math.max(0.01, duration);
  const safeStart = clamp(trimStart, 0, Math.max(0, safeDuration - 0.05));
  const safeEnd = clamp(trimEnd || safeDuration, safeStart + 0.05, safeDuration);
  const current = clamp(currentTime, safeStart, safeEnd);
  const cutSegments = useMemo(() => mergeRanges(cuts), [cuts]);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = src;

    const createFilmstrip = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Unable to load video"));
        });
        const actualDuration = Number.isFinite(video.duration) ? video.duration : duration;
        if (!duration && actualDuration) onDurationChange?.(actualDuration);
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 68;
        const context = canvas.getContext("2d");
        if (!context) return;
        const result: string[] = [];
        const count = 14;
        for (let index = 0; index < count; index += 1) {
          if (cancelled) return;
          const target = actualDuration * (index / Math.max(1, count - 1));
          await new Promise<void>((resolve) => {
            const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
            video.addEventListener("seeked", onSeeked, { once: true });
            video.currentTime = target;
            window.setTimeout(() => { video.removeEventListener("seeked", onSeeked); resolve(); }, 500);
          });
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          result.push(canvas.toDataURL("image/jpeg", 0.62));
        }
        if (!cancelled) setThumbnails(result);
      } catch {
        if (!cancelled) setThumbnails([]);
      }
    };
    createFilmstrip();
    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  const positionFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return current;
    const rect = track.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1) * safeDuration;
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const value = positionFromPointer(event.clientX);
      const gap = Math.min(0.08, safeDuration / 100);
      if (dragging === "start") {
        const next = clamp(value, 0, safeEnd - gap);
        onTrimChange(next, safeEnd);
        onCurrentTimeChange(next);
      } else if (dragging === "end") {
        const next = clamp(value, safeStart + gap, safeDuration);
        onTrimChange(safeStart, next);
        onCurrentTimeChange(next);
      } else {
        const next = clamp(value, safeStart, safeEnd);
        const blocked = cutSegments.find((range) => next >= range.start && next < range.end);
        onCurrentTimeChange(blocked ? blocked.end : next);
      }
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, safeDuration, safeStart, safeEnd, current, cutSegments]);

  const handleTrackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const value = clamp(positionFromPointer(event.clientX), safeStart, safeEnd);
    const blocked = cutSegments.find((range) => value >= range.start && value < range.end);
    onCurrentTimeChange(blocked ? Math.min(blocked.end, safeEnd) : value);
  };

  const playheadPercent = (current / safeDuration) * 100;
  const startPercent = (safeStart / safeDuration) * 100;
  const endPercent = (safeEnd / safeDuration) * 100;

  return (
    <section className="w-full select-none bg-black text-white" aria-label="Timeline de montage vidéo">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-white/80">
        <span>{formatTime(current)}</span>
        <span>{formatTime(Math.max(0, safeEnd - safeStart))}</span>
      </div>
      <div ref={trackRef} className="relative mx-3 h-[78px] overflow-hidden rounded-lg bg-white/10 touch-none" onPointerDown={handleTrackPointer}>
        <div className="absolute inset-0 flex">
          {(thumbnails.length ? thumbnails : Array.from({ length: 14 })).map((thumbnail, index) => (
            <div key={index} className="relative h-full flex-1 overflow-hidden border-r border-black/30">
              {thumbnail && <img src={thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />}
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/65" style={{ width: `${startPercent}%` }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/65" style={{ width: `${100 - endPercent}%` }} />
        {cutSegments.map((range) => (
          <div key={`${range.start}-${range.end}`} className="pointer-events-none absolute inset-y-0 bg-black/75" style={{ left: `${(range.start / safeDuration) * 100}%`, width: `${((range.end - range.start) / safeDuration) * 100}%` }} />
        ))}
        <div className="pointer-events-none absolute inset-y-0 z-10 border-x-2 border-white" style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }} />

        <button type="button" aria-label="Début de la vidéo" className="absolute top-0 bottom-0 z-30 w-5 -translate-x-1/2 touch-none" style={{ left: `${startPercent}%` }} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); setDragging("start"); }}>
          <span className="mx-auto block h-full w-1 rounded-full bg-white" />
          <span className="absolute left-1/2 top-1/2 h-10 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
        </button>
        <button type="button" aria-label="Fin de la vidéo" className="absolute top-0 bottom-0 z-30 w-5 -translate-x-1/2 touch-none" style={{ left: `${endPercent}%` }} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); setDragging("end"); }}>
          <span className="mx-auto block h-full w-1 rounded-full bg-white" />
          <span className="absolute left-1/2 top-1/2 h-10 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
        </button>
        <button type="button" aria-label="Position de lecture" className="absolute top-0 bottom-0 z-40 w-4 -translate-x-1/2 touch-none" style={{ left: `${playheadPercent}%` }} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); setDragging("playhead"); }}>
          <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-white" />
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />
        </button>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-white/55">
        <span>{formatTime(safeStart)}</span>
        <span>{formatTime(safeEnd)}</span>
      </div>
      {cutSegments.length > 0 && <div className="px-3 pb-2 text-[10px] text-white/45">Les zones assombries seront retirées au montage.</div>}
    </section>
  );
}
