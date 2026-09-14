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

const fmt = (v: number) => { const s = Math.max(0, Math.floor(v)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const seek = (v: HTMLVideoElement, t: number) => new Promise<void>((resolve) => { let done = false; const finish = () => { if (done) return; done = true; v.removeEventListener("seeked", finish); resolve(); }; v.addEventListener("seeked", finish, { once: true }); v.currentTime = t; window.setTimeout(finish, 700); });
const metadata = (v: HTMLVideoElement) => new Promise<void>((resolve, reject) => { if (v.readyState >= 1) return resolve(); const ok = () => { cleanup(); resolve(); }; const bad = () => { cleanup(); reject(new Error("metadata")); }; const cleanup = () => { v.removeEventListener("loadedmetadata", ok); v.removeEventListener("error", bad); }; v.addEventListener("loadedmetadata", ok, { once: true }); v.addEventListener("error", bad, { once: true }); });

export function ClipEditorFixed({ src, duration, trimStart, trimEnd, cuts, onTrimChange, onCutsChange, onCurrentTimeChange, onClose }: Props) {
  const { setFile, setSelectedMusic } = useUpload();
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [time, setTime] = useState(trimStart);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [history, setHistory] = useState<Range[][]>([]);
  const [future, setFuture] = useState<Range[][]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [drag, setDrag] = useState<"playhead" | "start" | "end" | null>(null);
  const end = trimEnd || duration;
  const removed = useMemo(() => [...cuts].sort((a, b) => a.start - b.start), [cuts]);
  const splitPoints = useMemo(() => removed.flatMap((r) => [r.start, r.end]).filter((p) => p > trimStart && p < end), [removed, trimStart, end]);

  const setPosition = (value: number) => {
    const clamped = Math.max(trimStart, Math.min(value, end));
    const blocked = removed.find((r) => clamped >= r.start && clamped < r.end);
    const target = blocked ? Math.min(blocked.end, end) : clamped;
    if (videoRef.current) videoRef.current.currentTime = target;
    setTime(target); onCurrentTimeChange?.(target);
  };

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const loaded = () => { v.currentTime = trimStart; v.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };
    const tick = () => {
      const t = v.currentTime;
      const cut = removed.find((r) => t >= r.start && t < r.end);
      if (cut) { v.currentTime = Math.min(cut.end, end); return; }
      if (t >= end - 0.04) { v.pause(); setPlaying(false); v.currentTime = end; return; }
      if (t < trimStart) { v.currentTime = trimStart; return; }
      setTime(t); onCurrentTimeChange?.(t);
    };
    const play = () => setPlaying(true); const pause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", loaded); v.addEventListener("timeupdate", tick); v.addEventListener("play", play); v.addEventListener("pause", pause);
    return () => { v.removeEventListener("loadedmetadata", loaded); v.removeEventListener("timeupdate", tick); v.removeEventListener("play", play); v.removeEventListener("pause", pause); };
  }, [src, trimStart, end, removed, onCurrentTimeChange]);

  useEffect(() => {
    let cancelled = false; const v = document.createElement("video"); v.src = src; v.muted = true; v.playsInline = true; v.preload = "metadata";
    const run = async () => { try { await metadata(v); const c = document.createElement("canvas"); c.width = 180; c.height = 100; const ctx = c.getContext("2d"); if (!ctx) return; const out: string[] = []; const total = v.duration || duration; for (let i = 0; i < 14; i++) { if (cancelled) return; await seek(v, total * i / 13); ctx.drawImage(v, 0, 0, c.width, c.height); out.push(c.toDataURL("image/jpeg", .6)); } if (!cancelled) setThumbs(out); } catch {} };
    void run(); return () => { cancelled = true; v.removeAttribute("src"); v.load(); };
  }, [src, duration]);

  const commitCuts = (next: Range[]) => { setHistory(h => [...h.slice(-19), cuts.map(r => ({ ...r }))]); setFuture([]); onCutsChange(next); };
  const undo = () => { const prev = history.at(-1); if (!prev) return; setFuture(f => [cuts.map(r => ({ ...r })), ...f]); setHistory(h => h.slice(0, -1)); onCutsChange(prev); };
  const redo = () => { const next = future[0]; if (!next) return; setHistory(h => [...h, cuts.map(r => ({ ...r }))]); setFuture(f => f.slice(1)); onCutsChange(next); };

  const split = () => {
    if (time <= trimStart + .08 || time >= end - .08) return toast.info("Place la tête de lecture sur le clip à diviser");
    const before = removed.find(r => time > r.start && time < r.end); if (before) return toast.info("Cette partie est déjà supprimée");
    const already = splitPoints.some(p => Math.abs(p - time) < .08); if (already) return toast.info("Le clip est déjà divisé ici");
    // A split is represented by a zero-width boundary through a temporary cut pair only in the editor.
    setSelection(time);
  };

  const [selection, setSelection] = useState<number | null>(null);
  const clips = useMemo(() => {
    const points = [trimStart, ...(selection != null ? [selection] : []), ...splitPoints, end].sort((a,b)=>a-b);
    const unique: number[] = []; for (const p of points) if (!unique.length || p - unique.at(-1)! > .05) unique.push(p);
    const result: Range[] = []; for (let i=0;i<unique.length-1;i++) { const a=unique[i],b=unique[i+1]; if (b>a && !removed.some(r=>a>=r.start-.01&&b<=r.end+.01)) result.push({start:a,end:b}); }
    return result;
  }, [trimStart, end, splitPoints, removed, selection]);
  const selected = clips.find(c => time >= c.start && time < c.end) || clips.at(-1) || null;

  const deleteSelected = () => {
    if (!selected || clips.length <= 1) return toast.info("Garder au moins 1 clip");
    commitCuts([...cuts, selected]); setSelection(null); setPosition(clips.find(c => c.start > selected.end+.02)?.start ?? trimStart); toast.success("Clip supprimé");
  };

  const replaceSelected = async (file: File) => {
    if (!selected) return toast.info("Sélectionne d'abord le clip à remplacer");
    if (!file.type.startsWith("video/")) return toast.error("Choisis une vidéo");
    const original = document.createElement("video"), replacement = document.createElement("video");
    const url = URL.createObjectURL(file); original.src=src; replacement.src=url; original.muted=true; replacement.muted=true; original.playsInline=true; replacement.playsInline=true;
    try {
      await Promise.all([metadata(original), metadata(replacement)]);
      const canvas=document.createElement("canvas"); canvas.width=original.videoWidth||720; canvas.height=original.videoHeight||1280; const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("canvas");
      const stream=canvas.captureStream(30); const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(t=>MediaRecorder.isTypeSupported(t)); const rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream); const chunks:Blob[]=[];
      const done=new Promise<Blob>(resolve=>rec.onstop=()=>resolve(new Blob(chunks,{type:rec.mimeType||"video/webm"}))); rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      const draw=async(v:HTMLVideoElement,a:number,b:number)=>{await seek(v,a); await v.play(); await new Promise<void>(resolve=>{const loop=()=>{if(v.currentTime>=b||v.ended){v.pause();resolve();return;}ctx.drawImage(v,0,0,canvas.width,canvas.height);requestAnimationFrame(loop)};loop()})};
      rec.start(200);
      for(const c of clips.filter(c=>c.end<=selected.start)) await draw(original,c.start,c.end);
      await draw(replacement,0,Math.min(replacement.duration,selected.end-selected.start));
      for(const c of clips.filter(c=>c.start>=selected.end)) await draw(original,c.start,c.end);
      rec.stop(); const blob=await done; if(blob.size<1024) throw new Error("empty");
      setFile(new File([blob],"afritok-replaced.webm",{type:blob.type||"video/webm"})); toast.success("Clip remplacé"); onClose();
    } catch(e){console.error(e);toast.error("Impossible de remplacer le clip sur cet appareil");} finally {URL.revokeObjectURL(url)}
  };

  useEffect(() => { const move=(e:PointerEvent)=>{if(!drag||!trackRef.current)return; const r=trackRef.current.getBoundingClientRect(); const t=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*Math.max(.01,duration); if(drag==="playhead")setPosition(t); else if(drag==="start")onTrimChange(Math.min(t,end-.1),end); else onTrimChange(trimStart,Math.max(t,trimStart+.1));}; const up=()=>setDrag(null); window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};},[drag,duration,end,trimStart]);

  return <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
    <header className="h-14 shrink-0 flex items-center justify-between px-3"><button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center" aria-label="Retour"><ArrowLeft size={26}/></button><span className="font-semibold text-sm">Modifier</span><button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-red-400" aria-label="Terminer"><Check size={26}/></button></header>
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 flex items-center justify-center px-4"><video ref={videoRef} src={src} playsInline muted={muted} className="max-h-full max-w-full object-contain" onClick={()=>videoRef.current?.paused?videoRef.current.play():videoRef.current?.pause()}/></div>
      <div className="shrink-0">
        <div className="h-12 flex items-center justify-center gap-6 text-white/80"><span className="text-sm tabular-nums">{fmt(time)} / {fmt(Math.max(0,end-trimStart))}</span><button onClick={()=>videoRef.current?.paused?videoRef.current.play():videoRef.current?.pause()} aria-label="Lecture"><span>{playing?<Pause size={20}/>:<Play size={20} fill="white"/>}</span></button><button aria-label="Image clé"><span className="text-xl">◇</span></button><button onClick={undo} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler"><Undo2 size={20}/></button><button onClick={redo} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir"><Redo2 size={20}/></button><button onClick={()=>videoRef.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19}/></button></div>
        <div className="px-3 pb-2"><div ref={trackRef} className="relative h-[86px] rounded-lg overflow-hidden bg-white/10 touch-none">
          <div className="absolute inset-0 flex">{(thumbs.length?thumbs:Array.from({length:14})).map((t,i)=><div key={i} className="flex-1 border-r border-black/30">{t&&<img src={t} alt="" className="h-full w-full object-cover"/>}</div>)}</div>
          <div className="absolute inset-y-0 left-0 bg-black/65" style={{width:`${trimStart/Math.max(.01,duration)*100}%`}}/><div className="absolute inset-y-0 right-0 bg-black/65" style={{width:`${100-end/Math.max(.01,duration)*100}%`}}/>
          {removed.map(r=><div key={`${r.start}-${r.end}`} className="absolute inset-y-0 bg-black/85" style={{left:`${r.start/duration*100}%`,width:`${(r.end-r.start)/duration*100}%`}}/>)}
          {splitPoints.map(p=><div key={p} className="absolute inset-y-0 w-[3px] bg-white z-20" style={{left:`${p/duration*100}%`}}/>)}
          {selection!=null&&<div className="absolute inset-y-1 z-20 border-2 border-white" style={{left:`${Math.max(trimStart,selected?.start??selection)/duration*100}%`,width:`${((selected?.end??selection)-(selected?.start??selection))/duration*100}%`}}/>}
          <button className="absolute top-0 bottom-0 w-6 -translate-x-1/2 z-40" style={{left:`${trimStart/duration*100}%`}} onPointerDown={e=>{e.stopPropagation();setDrag("start")}} aria-label="Début"><span className="block mx-auto h-full w-1 bg-white"/></button>
          <button className="absolute top-0 bottom-0 w-6 -translate-x-1/2 z-40" style={{left:`${end/duration*100}%`}} onPointerDown={e=>{e.stopPropagation();setDrag("end")}} aria-label="Fin"><span className="block mx-auto h-full w-1 bg-white"/></button>
          <button className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-50" style={{left:`${time/duration*100}%`}} onPointerDown={e=>{e.stopPropagation();setDrag("playhead")}} aria-label="Tête de lecture"><span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white"/><span className="absolute top-0 left-1/2 w-3 h-3 -translate-x-1/2 rounded-full bg-white"/></button>
          <button className="absolute inset-0 z-10" onClick={e=>{const r=trackRef.current?.getBoundingClientRect();if(r)setPosition((e.clientX-r.left)/r.width*duration)}} aria-label="Positionner la lecture"/>
        </div></div>
        <div className="h-12 flex items-center gap-3 px-4 border-t border-white/10"><button onClick={()=>setMuted(v=>!v)} aria-label={muted?"Activer le son":"Couper le son"}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><button onClick={()=>setShowAudio(true)} className="flex items-center gap-2 text-sm font-semibold"><Music2 size={18}/>Ajouter un son</button><span className="ml-auto text-xs text-white/45">{selected?`${fmt(selected.start)} → ${fmt(selected.end)}`:"Clip"}</span><button className="text-2xl" aria-label="Ajouter un clip">+</button></div>
        <div className="h-[82px] flex items-center gap-2 overflow-x-auto px-3 border-t border-white/10">
          <button onClick={split} className="min-w-[88px] h-16 rounded-xl bg-[#202020] flex flex-col items-center justify-center gap-1"><Scissors size={21}/><span className="text-xs">Diviser</span></button>
          <button onClick={()=>replaceRef.current?.click()} className="min-w-[88px] h-16 rounded-xl bg-[#202020] flex flex-col items-center justify-center gap-1"><Replace size={21}/><span className="text-xs">Remplacer</span></button>
          <button onClick={deleteSelected} className="min-w-[88px] h-16 rounded-xl bg-[#202020] flex flex-col items-center justify-center gap-1"><Trash2 size={21}/><span className="text-xs">Supprimer</span></button>
          <button onClick={()=>setShowSpeed(v=>!v)} className="min-w-[88px] h-16 rounded-xl bg-[#202020] flex flex-col items-center justify-center gap-1"><Gauge size={21}/><span className="text-xs">Vitesse</span></button>
          <input ref={replaceRef} type="file" accept="video/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];e.currentTarget.value="";if(f)void replaceSelected(f)}}/>
        </div>
        {showSpeed&&<div className="px-4 py-3 bg-[#151515] flex gap-2 justify-center">{[.5,1,1.5,2].map(v=><button key={v} onClick={()=>{setSpeed(v);if(videoRef.current)videoRef.current.playbackRate=v}} className={`px-4 py-2 rounded-full ${speed===v?"bg-white text-black":"bg-white/10"}`}>{v}x</button>)}</div>}
      </div>
    </div>
    {showAudio&&<AudioSelector onClose={()=>setShowAudio(false)} onSelectAudio={(url,name)=>{setSelectedMusic({url,name});setShowAudio(false)}}/>}
  </div>;
}
