import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { buildVideoSegments, splitVideoAt } from "@/lib/video-split";
import { toast } from "sonner";
import { ClipEditor } from "@/components/ClipEditor";

type Range = { start: number; end: number };

type VideoTimelineProps = {
  src: string;
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  cuts: Range[];
  splitPoints?: number[];
  onSplitPointsChange?: (points: number[]) => void;
  onCurrentTimeChange: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
  onCutsChange: (cuts: Range[]) => void;
  onDurationChange?: (duration: number) => void;
  showControls?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mergeRanges = (ranges: Range[]) => {
  const sorted = [...ranges].filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start).sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end + 0.02) merged.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  }
  return merged;
};
const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export function VideoTimeline({
  src, currentTime, duration, trimStart, trimEnd, cuts,
  splitPoints = [], onSplitPointsChange, onCurrentTimeChange, onTrimChange,
  onCutsChange, onDurationChange, showControls = true,
}: VideoTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [dragging, setDragging] = useState<"playhead" | "start" | "end" | null>(null);
  const [clipEditorOpen, setClipEditorOpen] = useState(false);
  const trimDismissedRef = useRef(false);
  const safeDuration = Math.max(0.01, duration);
  const safeStart = clamp(trimStart, 0, Math.max(0, safeDuration - 0.05));
  const safeEnd = clamp(trimEnd || safeDuration, safeStart + 0.05, safeDuration);
  const current = clamp(currentTime, safeStart, safeEnd);
  const cutSegments = useMemo(() => mergeRanges(cuts), [cuts]);
  const validSplits = useMemo(() => [...new Set(splitPoints.filter((p) => p > safeStart + 0.05 && p < safeEnd - 0.05).sort((a, b) => a - b))], [splitPoints, safeStart, safeEnd]);
  const segments = useMemo(() => buildVideoSegments(safeStart, safeEnd, cutSegments, validSplits), [safeStart, safeEnd, cutSegments, validSplits]);
  const selectedSegment = useMemo(() => segments.find((segment) => current >= segment.start && current < segment.end) || segments[segments.length - 1] || null, [segments, current]);

  useEffect(() => { onSplitPointsChange?.(validSplits); }, [validSplits]);

  useEffect(() => {
    const checkTrimPanel = () => {
      const open = Array.from(document.querySelectorAll("h2")).some((element) => element.textContent?.trim() === "Découper la vidéo");
      if (open && !trimDismissedRef.current) setClipEditorOpen(true);
      if (!open) trimDismissedRef.current = false;
    };
    checkTrimPanel();
    const observer = new MutationObserver(checkTrimPanel);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.preload = "metadata"; video.muted = true; video.playsInline = true; video.src = src;
    const createFilmstrip = async () => {
      try {
        await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error("video")); });
        const actualDuration = Number.isFinite(video.duration) ? video.duration : duration;
        if (!duration && actualDuration) onDurationChange?.(actualDuration);
        const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 90;
        const context = canvas.getContext("2d"); if (!context) return;
        const result: string[] = [];
        for (let index = 0; index < 18; index += 1) {
          if (cancelled) return;
          const target = actualDuration * (index / 17);
          await new Promise<void>((resolve) => {
            const seeked = () => { video.removeEventListener("seeked", seeked); resolve(); };
            video.addEventListener("seeked", seeked, { once: true }); video.currentTime = target;
            window.setTimeout(() => { video.removeEventListener("seeked", seeked); resolve(); }, 450);
          });
          context.drawImage(video, 0, 0, canvas.width, canvas.height); result.push(canvas.toDataURL("image/jpeg", 0.65));
        }
        if (!cancelled) setThumbnails(result);
      } catch { if (!cancelled) setThumbnails([]); }
    };
    createFilmstrip();
    return () => { cancelled = true; video.removeAttribute("src"); video.load(); };
  }, [src]);

  const positionFromPointer = (clientX: number) => {
    const track = trackRef.current; if (!track) return current;
    const rect = track.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1) * safeDuration;
  };
  const selectAt = (time: number) => {
    const blocked = cutSegments.find((r) => time >= r.start && time < r.end);
    onCurrentTimeChange(blocked ? Math.min(blocked.end, safeEnd) : clamp(time, safeStart, safeEnd));
  };
  const splitCurrent = () => {
    const next = splitVideoAt(current, safeStart, safeEnd, cutSegments, validSplits);
    if (next.length === validSplits.length) { toast.info("Place la tête de lecture sur un clip à diviser"); return; }
    onSplitPointsChange?.(next); toast.success(`Clip divisé à ${formatTime(current)}`);
  };
  const deleteSelectedSegment = () => {
    if (!selectedSegment || segments.length <= 1) { toast.info("Garder au moins 1 clip"); return; }
    const nextCuts = mergeRanges([...cuts, { start: selectedSegment.start, end: selectedSegment.end }]);
    onCutsChange(nextCuts);
    onSplitPointsChange?.(validSplits.filter((point) => point < selectedSegment.start - 0.02 || point > selectedSegment.end + 0.02));
    const nextSegment = segments.find((segment) => segment.start > selectedSegment.end + 0.02) || segments.find((segment) => segment.end < selectedSegment.start - 0.02);
    if (nextSegment) onCurrentTimeChange(nextSegment.start);
    toast.success("Clip supprimé");
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const value = positionFromPointer(event.clientX); const gap = Math.min(0.08, safeDuration / 100);
      if (dragging === "start") { const next = clamp(value, 0, safeEnd - gap); onTrimChange(next, safeEnd); onCurrentTimeChange(next); }
      else if (dragging === "end") { const next = clamp(value, safeStart + gap, safeDuration); onTrimChange(safeStart, next); onCurrentTimeChange(next); }
      else selectAt(value);
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [dragging, safeDuration, safeStart, safeEnd, cutSegments]);

  const handleTrackPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    selectAt(positionFromPointer(event.clientX));
  };
  const playheadPercent = (current / safeDuration) * 100;
  const startPercent = (safeStart / safeDuration) * 100;
  const endPercent = (safeEnd / safeDuration) * 100;

  return <section className="w-full select-none bg-black text-white" aria-label="Timeline de montage vidéo">
    <div className="flex items-center justify-between px-3 py-1.5 text-xs text-white/80"><span>{formatTime(current)}</span><span>{formatTime(Math.max(0, safeEnd - safeStart))}</span></div>
    <div ref={trackRef} className="relative mx-3 h-[78px] overflow-hidden rounded-lg bg-white/10 touch-none" onPointerDown={handleTrackPointer}>
      <div className="absolute inset-0 flex">{(thumbnails.length ? thumbnails : Array.from({ length: 18 })).map((thumbnail, index) => <div key={index} className="relative h-full flex-1 overflow-hidden border-r border-black/30">{thumbnail && <img src={thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />}</div>)}</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/70" style={{ width: `${startPercent}%` }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/70" style={{ width: `${100 - endPercent}%` }} />
      {cutSegments.map((range) => <div key={`${range.start}-${range.end}`} className="pointer-events-none absolute inset-y-0 bg-black/85" style={{ left: `${(range.start / safeDuration) * 100}%`, width: `${((range.end - range.start) / safeDuration) * 100}%` }} />)}
      {validSplits.map((point) => <div key={`split-${point}`} className="pointer-events-none absolute inset-y-0 z-20 w-[3px] bg-white" style={{ left: `${(point / safeDuration) * 100}%` }} />)}
      {selectedSegment && <div className="pointer-events-none absolute inset-y-0 z-[15] border-2 border-white/90" style={{ left: `${(selectedSegment.start / safeDuration) * 100}%`, width: `${((selectedSegment.end - selectedSegment.start) / safeDuration) * 100}%` }} />}
      <div className="pointer-events-none absolute inset-y-0 z-10 border-x-2 border-white" style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }} />
      <button type="button" aria-label="Début de la vidéo" className="absolute top-0 bottom-0 z-30 w-6 -translate-x-1/2 touch-none" style={{ left: `${startPercent}%` }} onPointerDown={(event) => { event.stopPropagation(); setDragging("start"); }}><span className="mx-auto block h-full w-1 rounded-full bg-white" /><span className="absolute left-1/2 top-1/2 h-10 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" /></button>
      <button type="button" aria-label="Fin de la vidéo" className="absolute top-0 bottom-0 z-30 w-6 -translate-x-1/2 touch-none" style={{ left: `${endPercent}%` }} onPointerDown={(event) => { event.stopPropagation(); setDragging("end"); }}><span className="mx-auto block h-full w-1 rounded-full bg-white" /><span className="absolute left-1/2 top-1/2 h-10 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" /></button>
      <button type="button" aria-label="Position de lecture" className="absolute top-0 bottom-0 z-40 w-5 -translate-x-1/2 touch-none" style={{ left: `${playheadPercent}%` }} onPointerDown={(event) => { event.stopPropagation(); setDragging("playhead"); }}><span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-white" /><span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-white" /></button>
    </div>
    <div className="flex items-center justify-between px-3 py-1 text-[10px] text-white/50"><span>{formatTime(safeStart)}</span><span>{formatTime(safeEnd)}</span></div>
    {showControls && <div className="flex items-center justify-center gap-2 px-3 pb-2"><button type="button" onClick={splitCurrent} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold">Diviser</button><button type="button" onClick={deleteSelectedSegment} className="rounded-full bg-red-500/90 px-4 py-1.5 text-xs font-semibold">Supprimer</button></div>}
    {clipEditorOpen && <ClipEditor
      src={src}
      duration={duration}
      trimStart={safeStart}
      trimEnd={safeEnd}
      cuts={cuts}
      onTrimChange={onTrimChange}
      onCutsChange={onCutsChange}
      onCurrentTimeChange={onCurrentTimeChange}
      onClose={() => {
        trimDismissedRef.current = true;
        setClipEditorOpen(false);
        const heading = Array.from(document.querySelectorAll("h2")).find((element) => element.textContent?.trim() === "Découper la vidéo");
        const backButton = heading?.parentElement?.querySelector("button");
        if (backButton instanceof HTMLButtonElement) backButton.click();
      }}
    />}
  </section>;
}
