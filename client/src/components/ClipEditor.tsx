import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2, Replace, Music2 } from "lucide-react";
import { toast } from "sonner";
import { useUpload } from "@/contexts/UploadContext";
import AudioSelector from "@/components/AudioSelector.tsx";

type Range = { start: number; end: number };

type ClipEditorProps = {
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

function waitForMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 1) { resolve(); return; }
    const ok = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("video metadata")); };
    const cleanup = () => { video.removeEventListener("loadedmetadata", ok); video.removeEventListener("error", fail); };
    video.addEventListener("loadedmetadata", ok, { once: true });
    video.addEventListener("error", fail, { once: true });
  });
}

function waitForSeek(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; video.removeEventListener("seeked", finish); resolve(); };
    video.addEventListener("seeked", finish, { once: true });
    window.setTimeout(finish, 900);
  });
}

const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export function ClipEditor({ src, duration, trimStart, trimEnd, cuts, onTrimChange, onCutsChange, onCurrentTimeChange, onClose }: ClipEditorProps) {
  const { setFile, setSelectedMusic } = useUpload();
  const videoRef = useRef<HTMLVideoElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(trimStart);
  const [playing, setPlaying] = useState(true);
  const [history, setHistory] = useState<Range[][]>([]);
  const [future, setFuture] = useState<Range[][]>([]);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [isReplacing, setIsReplacing] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [dragMode, setDragMode] = useState<"playhead" | "start" | "end" | null>(null);

  const safeEnd = trimEnd || duration;
  const removed = useMemo(() => [...cuts].sort((a, b) => a.start - b.start), [cuts]);

  const setTime = (time: number) => {
    const safe = Math.max(trimStart, Math.min(time, safeEnd));
    const blocked = removed.find((r) => safe >= r.start && safe < r.end);
    const target = blocked ? Math.min(blocked.end, safeEnd) : safe;
    if (videoRef.current) videoRef.current.currentTime = target;
    setCurrentTime(target);
    onCurrentTimeChange?.(target);
  };

  const commitCuts = (next: Range[]) => {
    setHistory((items) => [...items.slice(-19), cuts.map((r) => ({ ...r }))]);
    setFuture([]);
    onCutsChange(next);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((items) => [cuts.map((r) => ({ ...r })), ...items].slice(0, 20));
    setHistory((items) => items.slice(0, -1));
    onCutsChange(previous);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items, cuts.map((r) => ({ ...r }))].slice(-20));
    setFuture((items) => items.slice(1));
    onCutsChange(next);
  };

  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src; video.preload = "metadata"; video.muted = true; video.playsInline = true;
    const build = async () => {
      try {
        await waitForMetadata(video);
        const canvas = document.createElement("canvas"); canvas.width = 180; canvas.height = 100;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        const out: string[] = [];
        const total = video.duration || duration;
        for (let i = 0; i < 14; i += 1) {
          if (cancelled) return;
          video.currentTime = total * (i / 13); await waitForSeek(video);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          out.push(canvas.toDataURL("image/jpeg", 0.62));
        }
        if (!cancelled) setThumbnails(out);
      } catch {}
    };
    void build();
    return () => { cancelled = true; video.removeAttribute("src"); video.load(); };
  }, [src, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      const start = Math.max(trimStart, Math.min(video.duration || 0, safeEnd));
      video.currentTime = start;
      setCurrentTime(start);
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    const onTime = () => {
      const t = video.currentTime;
      const cut = removed.find((r) => t >= r.start && t < r.end);
      if (cut) { video.currentTime = Math.min(cut.end, safeEnd); return; }
      if (t >= safeEnd - 0.03) { video.pause(); setPlaying(false); video.currentTime = safeEnd; return; }
      if (t < trimStart) { video.currentTime = trimStart; return; }
      setCurrentTime(t);
      onCurrentTimeChange?.(t);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [src, trimStart, safeEnd, removed, onCurrentTimeChange]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragMode || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const raw = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const time = raw * Math.max(0.01, duration);
      if (dragMode === "playhead") setTime(time);
      if (dragMode === "start") onTrimChange(Math.min(time, safeEnd - 0.1), safeEnd);
      if (dragMode === "end") onTrimChange(trimStart, Math.max(time, trimStart + 0.1));
    };
    const up = () => setDragMode(null);
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [dragMode, duration, trimStart, safeEnd]);

  const currentClip = () => {
    const points = [trimStart, ...splitPoints, ...removed.flatMap((r) => [r.start, r.end]), safeEnd].sort((a, b) => a - b);
    const unique: number[] = [];
    for (const p of points) if (!unique.length || p > unique[unique.length - 1] + 0.05) unique.push(p);
    for (let i = 0; i < unique.length - 1; i += 1) {
      const a = unique[i]; const b = unique[i + 1];
      if (currentTime >= a && currentTime < b && !removed.some((r) => currentTime >= r.start && currentTime < r.end)) return { start: a, end: b };
    }
    return null;
  };

  const split = () => {
    const point = currentTime;
    if (point <= trimStart + 0.08 || point >= safeEnd - 0.08) {
      toast.info("Place la tête de lecture à l'endroit où tu veux diviser");
      return;
    }
    const next = [...new Set([...splitPoints, point])].sort((a, b) => a - b);
    if (next.length === splitPoints.length) return;
    setSplitPoints(next);
    toast.success(`Clip divisé à ${formatTime(point)}`);
  };

  const removeCurrentClip = () => {
    const points = [trimStart, ...splitPoints, ...removed.flatMap((r) => [r.start, r.end]), safeEnd].sort((a, b) => a - b);
    const unique: number[] = [];
    for (const p of points) if (!unique.length || p > unique[unique.length - 1] + 0.05) unique.push(p);
    const clips: Range[] = [];
    for (let i = 0; i < unique.length - 1; i += 1) {
      const a = unique[i]; const b = unique[i + 1];
      if (b > a && !removed.some((r) => a >= r.start - 0.01 && b <= r.end + 0.01)) clips.push({ start: a, end: b });
    }
    if (clips.length <= 1) { toast.info("Garder au moins 1 clip"); return; }
    const selected = clips.find((r) => currentTime >= r.start && currentTime < r.end);
    if (!selected) { toast.info("Sélectionne un clip"); return; }
    const nextCuts = [...removed, selected].sort((a, b) => a.start - b.start);
    commitCuts(nextCuts);
    setSplitPoints((items) => items.filter((p) => p < selected.start - 0.02 || p > selected.end + 0.02));
    const nextClip = clips.find((r) => r.start > selected.end + 0.02) || clips.find((r) => r.end < selected.start - 0.02);
    setTime(nextClip?.start ?? trimStart);
    toast.success("Clip supprimé");
  };

  const replaceSelected = async (replacement: File) => {
    const selected = currentClip();
    if (!selected || selected.end - selected.start < 0.08) { toast.info("Sélectionne d'abord le clip à remplacer"); return; }
    if (!replacement.type.startsWith("video/")) { toast.error("Choisis une vidéo"); return; }
    setIsReplacing(true);
    const original = document.createElement("video");
    const replacementVideo = document.createElement("video");
    const replacementUrl = URL.createObjectURL(replacement);
    original.src = src; replacementVideo.src = replacementUrl;
    original.muted = true; replacementVideo.muted = true; original.playsInline = true; replacementVideo.playsInline = true;
    try {
      await Promise.all([waitForMetadata(original), waitForMetadata(replacementVideo)]);
      const canvas = document.createElement("canvas");
      canvas.width = original.videoWidth || 720; canvas.height = original.videoHeight || 1280;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas indisponible");
      const stream = canvas.captureStream(30);
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const stopped = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" })); });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const drawVideo = async (video: HTMLVideoElement, start: number, end: number) => {
        video.currentTime = start; await waitForSeek(video); await video.play();
        return new Promise<void>((resolve) => {
          const tick = () => {
            if (video.currentTime >= end || video.ended) { video.pause(); resolve(); return; }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height); requestAnimationFrame(tick);
          };
          tick();
        });
      };
      recorder.start(250);
      const originalParts: Range[] = [];
      const points = [trimStart, selected.start, selected.end, safeEnd, ...removed.flatMap((r) => [r.start, r.end])].sort((a, b) => a - b);
      const unique: number[] = [];
      for (const p of points) if (!unique.length || p > unique[unique.length - 1] + 0.02) unique.push(p);
      for (let i = 0; i < unique.length - 1; i += 1) {
        const a = unique[i]; const b = unique[i + 1];
        if (b <= a || a >= selected.start - 0.01 && b <= selected.end + 0.01) continue;
        if (!removed.some((r) => a >= r.start - 0.01 && b <= r.end + 0.01)) originalParts.push({ start: a, end: b });
      }
      for (const part of originalParts.filter((p) => p.end <= selected.start)) await drawVideo(original, part.start, part.end);
      await drawVideo(replacementVideo, 0, Math.min(replacementVideo.duration, selected.end - selected.start));
      for (const part of originalParts.filter((p) => p.start >= selected.end)) await drawVideo(original, part.start, part.end);
      recorder.stop();
      const blob = await stopped;
      if (blob.size < 1024) throw new Error("Export vide");
      setFile(new File([blob], "afritok-remplacement.webm", { type: blob.type || "video/webm" }));
      toast.success("Clip remplacé");
      onClose();
    } catch (error) {
      console.error("[ClipEditor] replace", error); toast.error("Impossible de remplacer ce clip sur cet appareil");
    } finally {
      URL.revokeObjectURL(replacementUrl); setIsReplacing(false);
    }
  };

  return <div className="fixed inset-0 z-[80] bg-black text-white flex flex-col">
    <header className="h-14 shrink-0 flex items-center justify-between px-3 border-b border-white/10">
      <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full" aria-label="Retour"><ArrowLeft size={25} /></button>
      <div className="text-sm font-semibold">Modifier</div>
      <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full text-red-400" aria-label="Terminer"><Check size={25} /></button>
    </header>

    <div className="min-h-0 flex-1 flex flex-col">
      <div className="min-h-0 flex-1 flex items-center justify-center bg-black px-2">
        <video ref={videoRef} src={src} playsInline className="max-h-full max-w-full object-contain" onClick={toggle} />
      </div>

      <div className="shrink-0 bg-black border-t border-white/10">
        <div className="h-11 flex items-center justify-center gap-5 text-white/80">
          <span className="text-xs tabular-nums">{formatTime(currentTime)} / {formatTime(Math.max(0, safeEnd - trimStart))}</span>
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"}>{playing ? <Pause size={19} fill="white" /> : <Play size={19} fill="white" />}</button>
          <button type="button" onClick={undo} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler"><Undo2 size={19} /></button>
          <button type="button" onClick={redo} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir"><Redo2 size={19} /></button>
          <button type="button" onClick={() => videoRef.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={18} /></button>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center justify-between text-[11px] text-white/70 mb-1"><span>{formatTime(currentTime)}</span><span>{formatTime(Math.max(0, safeEnd - trimStart))}</span></div>
          <div ref={trackRef} className="relative h-[82px] overflow-hidden rounded-lg bg-white/10 touch-none">
            <div className="absolute inset-0 flex">{(thumbnails.length ? thumbnails : Array.from({ length: 14 })).map((thumb, index) => <div key={index} className="flex-1 border-r border-black/30">{thumb && <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />}</div>)}</div>
            <div className="absolute inset-y-0 left-0 bg-black/70 pointer-events-none" style={{ width: `${(trimStart / Math.max(0.01, duration)) * 100}%` }} />
            <div className="absolute inset-y-0 right-0 bg-black/70 pointer-events-none" style={{ width: `${100 - (safeEnd / Math.max(0.01, duration)) * 100}%` }} />
            {removed.map((range) => <div key={`${range.start}-${range.end}`} className="absolute inset-y-0 bg-black/85 pointer-events-none" style={{ left: `${(range.start / duration) * 100}%`, width: `${((range.end - range.start) / duration) * 100}%` }} />)}
            {splitPoints.map((point) => <div key={point} className="absolute inset-y-0 w-[3px] bg-white z-20 pointer-events-none" style={{ left: `${(point / duration) * 100}%` }} />)}
            <div className="absolute inset-y-0 border-2 border-white pointer-events-none z-10" style={{ left: `${(trimStart / duration) * 100}%`, width: `${((safeEnd - trimStart) / duration) * 100}%` }} />
            <button type="button" aria-label="Début du clip" className="absolute top-0 bottom-0 w-6 -translate-x-1/2 z-30" style={{ left: `${(trimStart / duration) * 100}%` }} onPointerDown={(e) => { e.stopPropagation(); setDragMode("start"); }}><span className="mx-auto block h-full w-1 bg-white rounded" /></button>
            <button type="button" aria-label="Fin du clip" className="absolute top-0 bottom-0 w-6 -translate-x-1/2 z-30" style={{ left: `${(safeEnd / duration) * 100}%` }} onPointerDown={(e) => { e.stopPropagation(); setDragMode("end"); }}><span className="mx-auto block h-full w-1 bg-white rounded" /></button>
            <button type="button" aria-label="Tête de lecture" className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-40" style={{ left: `${(currentTime / duration) * 100}%` }} onPointerDown={(e) => { e.stopPropagation(); setDragMode("playhead"); }}><span className="absolute left-1/2 top-0 h-full w-0.5 bg-white -translate-x-1/2" /><span className="absolute left-1/2 top-0 h-3 w-3 bg-white rounded-full -translate-x-1/2" /></button>
            <button type="button" aria-label="Choisir la position" className="absolute inset-0 z-[5]" onClick={(e) => { const rect = trackRef.current?.getBoundingClientRect(); if (!rect) return; setTime(((e.clientX - rect.left) / rect.width) * duration); }} />
          </div>
        </div>

        <div className="px-3 py-2 border-t border-white/10 text-xs text-white/55 flex items-center gap-2">
          <span className="h-7 w-7 rounded bg-white/10 flex items-center justify-center">♪</span>
          <button type="button" onClick={() => setShowAudio(true)} className="flex items-center gap-2 text-left"><Music2 size={16} /><span>Ajouter un son</span></button>
        </div>

        <div className="h-[74px] flex items-center justify-center gap-3 px-3 overflow-x-auto border-t border-white/10">
          <button type="button" onClick={split} className="min-w-[78px] flex flex-col items-center gap-1 text-xs"><Scissors size={20} /><span>Diviser</span></button>
          <button type="button" onClick={removeCurrentClip} className="min-w-[78px] flex flex-col items-center gap-1 text-xs"><Trash2 size={20} /><span>Supprimer</span></button>
          <button type="button" disabled={isReplacing} onClick={() => replaceInputRef.current?.click()} className="min-w-[78px] flex flex-col items-center gap-1 text-xs disabled:opacity-40"><Replace size={20} /><span>{isReplacing ? "Remplacement…" : "Remplacer"}</span></button>
          <input ref={replaceInputRef} type="file" accept="video/*" className="hidden" onChange={(event) => { const chosen = event.target.files?.[0]; event.currentTarget.value = ""; if (chosen) void replaceSelected(chosen); }} />
        </div>
      </div>
    </div>
    {showAudio && <AudioSelector onClose={() => setShowAudio(false)} onSelectAudio={(url, name) => { setSelectedMusic({ url, name }); setShowAudio(false); }} />}
  </div>;
}
