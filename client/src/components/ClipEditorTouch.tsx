import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Range = { start:number; end:number; id?:string };
type HistoryState = { cuts:Range[]; splits:number[]; start:number; end:number };
type Props = { src:string; duration:number; trimStart:number; trimEnd:number; cuts:Range[]; onTrimChange:(start:number,end:number)=>void; onCutsChange:(cuts:Range[])=>void; onCurrentTimeChange?:(time:number)=>void; onClose:()=>void };
const clamp = (n: number, a: number, b: number) => {
  const safeA = Number.isFinite(a) ? a : 0;
  const safeB = Number.isFinite(b) ? b : safeA;
  const safeN = Number.isFinite(n) ? n : safeA;

  const min = Math.min(safeA, safeB);
  const max = Math.max(safeA, safeB);

  return Math.max(min, Math.min(safeN, max));
};
const label = (v: number) => {
  if (!Number.isFinite(v) || v < 0) {
    return "00:00";
  }

  const s = Math.floor(v);

  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
    s % 60
  ).padStart(2, "0")}`;
};
const merge=(rs:Range[])=>rs.filter(r=>r.end-r.start>.05).sort((a,b)=>a.start-b.start).reduce<Range[]>((o,r)=>{const l=o[o.length-1];if(l&&r.start<=l.end+.03)l.end=Math.max(l.end,r.end);else o.push({...r});return o},[]);

export function ClipEditorTouch(p:Props){
	 const {src,duration,trimStart,trimEnd,cuts,onTrimChange,onCutsChange,onCurrentTimeChange,onClose}=p;
	 const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
	 const safeTrimStart = Number.isFinite(trimStart) && trimStart >= 0 ? trimStart : 0;
	 const safeTrimEnd = Number.isFinite(trimEnd) && trimEnd > 0 ? Math.min(trimEnd, safeDuration || trimEnd) : safeDuration;
	 const end = Math.max(safeTrimStart, safeTrimEnd);
	 const video=useRef<HTMLVideoElement>(null),timeline=useRef<HTMLDivElement>(null),dragging=useRef(false),timeRef=useRef(safeTrimStart);
	 const boundsRef=useRef({start:safeTrimStart,end});
	 const [time,setTime]=useState(safeTrimStart),[playing,setPlaying]=useState(false),[thumbs,setThumbs]=useState<string[]>([]),[splits,setSplits]=useState<number[]>([]),[selected,setSelected]=useState<Range|null>(null),[history,setHistory]=useState<HistoryState[]>([]),[future,setFuture]=useState<HistoryState[]>([]);
	 const removed=useMemo(()=>merge(cuts),[cuts]);
	 const boundaries=useMemo(()=>[trimStart,...splits.filter(x=>x>trimStart+.05&&x<end-.05),end].sort((a,b)=>a-b),[trimStart,end,splits]);
	 const clips=useMemo(()=>boundaries.slice(0,-1).map((a,i)=>({start:a,end:boundaries[i+1]})).filter(c=>c.end-c.start>.05&&!removed.some(r=>c.start>=r.start-.02&&c.end<=r.end+.02)),[boundaries,removed]);
	 const clipItems=useMemo(()=>clips.map((clip,index)=>({...clip,id:`clip-${index}-${clip.start}-${clip.end}`})),[clips]);
	 useEffect(()=>{timeRef.current=clamp(time,trimStart,end);boundsRef.current={start:trimStart,end}},[time,trimStart,end]);
	 useEffect(()=>{const currentClip=clipItems.find(clip=>timeRef.current>=clip.start&&timeRef.current<clip.end);if(!currentClip)return;setSelected(previous=>{if(previous?.id===currentClip.id)return previous;return {id:currentClip.id,start:currentClip.start,end:currentClip.end}})},[clipItems,time]);
	 const seek=(raw:number)=>{const safe=clamp(raw,boundsRef.current.start,boundsRef.current.end);const r=removed.find(x=>safe>=x.start&&safe<x.end);const t=r?clamp(r.end+.001,boundsRef.current.start,boundsRef.current.end):safe;timeRef.current=t;setTime(t);onCurrentTimeChange?.(t);const v=video.current;if(v&&Math.abs(v.currentTime-t)>.003)v.currentTime=t};
	 const timeFromClientX=(x:number)=>{const el=timeline.current;if(!el)return timeRef.current;const r=el.getBoundingClientRect();return boundsRef.current.start+clamp((x-r.left)/Math.max(1,r.width),0,1)*(boundsRef.current.end-boundsRef.current.start)};
	 const selectAt=(t:number)=>{const c=clipItems.find(x=>t>=x.start&&t<x.end);if(!c){setSelected(null);return}setSelected({id:c.id,start:c.start,end:c.end})};
 const startDrag=(x:number)=>{if(!timeline.current)return;dragging.current=true;video.current?.pause();setPlaying(false);seek(timeFromClientX(x));selectAt(timeRef.current)};
 const moveDrag=(x:number)=>{if(dragging.current)seek(timeFromClientX(x))};
 const finishDrag=()=>{if(!dragging.current)return;dragging.current=false;selectAt(timeRef.current)};
 useEffect(()=>{
   const el=timeline.current;if(!el)return;
   const touchStart=(e:TouchEvent)=>{if(!e.touches.length)return;e.preventDefault();startDrag(e.touches[0].clientX)};
   const touchMove=(e:TouchEvent)=>{if(!dragging.current||!e.touches.length)return;e.preventDefault();moveDrag(e.touches[0].clientX)};
   const touchEnd=(e:TouchEvent)=>{if(dragging.current)e.preventDefault();finishDrag()};
   const pointerDown=(e:PointerEvent)=>{if(e.pointerType==="touch")return;if(e.button!==0)return;e.preventDefault();startDrag(e.clientX)};
   const pointerMove=(e:PointerEvent)=>{if(!dragging.current||e.pointerType==="touch")return;e.preventDefault();moveDrag(e.clientX)};
   const pointerUp=()=>finishDrag();
   el.addEventListener("touchstart",touchStart,{passive:false});el.addEventListener("touchmove",touchMove,{passive:false});el.addEventListener("touchend",touchEnd,{passive:false});el.addEventListener("touchcancel",touchEnd,{passive:false});
   el.addEventListener("pointerdown",pointerDown,{passive:false});el.addEventListener("pointermove",pointerMove,{passive:false});el.addEventListener("pointerup",pointerUp);el.addEventListener("pointercancel",pointerUp);
   return()=>{el.removeEventListener("touchstart",touchStart);el.removeEventListener("touchmove",touchMove);el.removeEventListener("touchend",touchEnd);el.removeEventListener("touchcancel",touchEnd);el.removeEventListener("pointerdown",pointerDown);el.removeEventListener("pointermove",pointerMove);el.removeEventListener("pointerup",pointerUp);el.removeEventListener("pointercancel",pointerUp)};
 },[]);
 useEffect(()=>{const v=video.current;if(!v)return;const tick=()=>{const t=v.currentTime,r=removed.find(x=>t>=x.start&&t<x.end);if(r){v.currentTime=clamp(r.end+.001,trimStart,end);return}if(t>=end-.03){v.pause();setPlaying(false);timeRef.current=end;setTime(end);return}if(!dragging.current&&t>=trimStart){timeRef.current=t;setTime(t);onCurrentTimeChange?.(t)}};const pl=()=>setPlaying(true),pa=()=>setPlaying(false);v.addEventListener("timeupdate",tick);v.addEventListener("play",pl);v.addEventListener("pause",pa);return()=>{v.removeEventListener("timeupdate",tick);v.removeEventListener("play",pl);v.removeEventListener("pause",pa)}},[trimStart,end,removed,onCurrentTimeChange]);
 useEffect(()=>{let dead=false;const v=document.createElement("video");v.src=src;v.muted=true;v.playsInline=true;v.preload="metadata";const meta=()=>new Promise<void>(r=>{if(v.readyState>=1)return r();v.addEventListener("loadedmetadata",()=>r(),{once:true})});const frame=(t:number)=>new Promise<void>(r=>{let done=false;const f=()=>{if(done)return;done=true;v.removeEventListener("seeked",f);r()};v.addEventListener("seeked",f,{once:true});v.currentTime=t;setTimeout(f,500)});(async()=>{try{await meta();const c=document.createElement("canvas");c.width=240;c.height=135;const ctx=c.getContext("2d");if(!ctx)return;const out:string[]=[];for(let i=0;i<18;i++){if(dead)return;await frame((v.duration||duration)*i/17);ctx.drawImage(v,0,0,240,135);out.push(c.toDataURL("image/jpeg",.55))}if(!dead)setThumbs(out)}catch{}})();return()=>{dead=true;v.removeAttribute("src");v.load()}},[src,duration]);
 const remember=()=>{setHistory(h=>[...h.slice(-19),{cuts:cuts.map(r=>({...r})),splits:[...splits],start:trimStart,end}]);setFuture([])};
	 const split=()=>{const t=timeRef.current,c=selected||clipItems.find(x=>t>x.start+.08&&t<x.end-.08);if(!c)return toast.info("Déplace la ligne blanche à l'endroit exact de la coupe");if(splits.some(x=>Math.abs(x-t)<.08))return toast.info("La vidéo est déjà divisée ici");remember();setSplits(s=>[...s,t].sort((a,b)=>a-b));setSelected(null);toast.success(`Vidéo divisée à ${label(t)}`)};
	 const del=()=>{const t=timeRef.current,c=selected||clipItems.find(x=>t>=x.start&&t<x.end);if(!c)return toast.info("Sélectionne la partie à supprimer");if(clips.length<=1)return toast.info("Garder au moins 1 clip");remember();onCutsChange(merge([...cuts,c]));setSplits(s=>s.filter(x=>x<c!.start-.05||x>c!.end+.05));setSelected(null);seek(clips.find(x=>x.start>c!.end+.02)?.start??trimStart);toast.success("Partie supprimée")};
	 const before=()=>{const c=selected||clipItems.find(clip=>timeRef.current>=clip.start&&timeRef.current<clip.end);const t=c?clamp(timeRef.current,c.start,c.end):timeRef.current;if(t<=trimStart+.05)return toast.info("Glisse la ligne vers la droite");remember();onTrimChange(t,end);onCutsChange(cuts.filter(r=>r.end>t));setSplits(s=>s.filter(x=>x>t+.05));seek(t);toast.success("Début supprimé")};
	 const after=()=>{const c=selected||clipItems.find(clip=>timeRef.current>=clip.start&&timeRef.current<clip.end);const t=c?clamp(timeRef.current,c.start,c.end):timeRef.current;if(t>=end-.05)return toast.info("Glisse la ligne vers la gauche");remember();onTrimChange(trimStart,t);onCutsChange(cuts.filter(r=>r.start<t));setSplits(s=>s.filter(x=>x<t-.05));seek(t-.01);toast.success("Fin supprimée")};
 const undo=()=>{const h=history[history.length-1];if(!h)return;setFuture(f=>[...f,{cuts:cuts.map(r=>({...r})),splits:[...splits],start:trimStart,end}]);setHistory(x=>x.slice(0,-1));onCutsChange(h.cuts);onTrimChange(h.start,h.end);setSplits(h.splits);setSelected(null);seek(h.start)};
 const redo=()=>{const h=future[future.length-1];if(!h)return;setHistory(x=>[...x,{cuts:cuts.map(r=>({...r})),splits:[...splits],start:trimStart,end}]);setFuture(x=>x.slice(0,-1));onCutsChange(h.cuts);onTrimChange(h.start,h.end);setSplits(h.splits);setSelected(null);seek(h.start)};
 const toggle=()=>{const v=video.current;if(!v)return;if(v.paused){if(v.currentTime<trimStart||v.currentTime>=end)v.currentTime=trimStart;v.play().catch(()=>{})}else v.pause()};
 const pct=((time-trimStart)/Math.max(.001,end-trimStart))*100;
 return <div className="fixed inset-0 z-[110] bg-black text-white flex flex-col overflow-hidden">
  <header className="h-14 shrink-0 flex items-center justify-between px-3"><button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Retour"><ArrowLeft size={26}/></button><span className="font-semibold text-sm">Modifier la vidéo</span><button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400" aria-label="Terminer"><Check size={27}/></button></header>
  <div className="flex-1 min-h-0 flex flex-col"><div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2"><video ref={video} src={src} playsInline className="max-h-full max-w-full object-contain" onClick={toggle}/></div>
   <div className="shrink-0 px-3"><div className="h-11 flex items-center justify-center gap-6"><span className="text-sm tabular-nums">{label(time-trimStart)} / {label(end-trimStart)}</span><button onClick={toggle} aria-label={playing?"Pause":"Lire"}>{playing?<Pause size={20}/>:<Play size={20} fill="white"/>}</button><button onClick={undo} disabled={!history.length} className="disabled:opacity-25" aria-label="Annuler"><Undo2 size={20}/></button><button onClick={redo} disabled={!future.length} className="disabled:opacity-25" aria-label="Rétablir"><Redo2 size={20}/></button><button onClick={()=>video.current?.requestFullscreen?.()} aria-label="Plein écran"><Maximize2 size={19}/></button></div>
	    <div className="pb-3"><div ref={timeline} className="relative h-[84px] rounded-md bg-white/10 select-none" style={{touchAction:"none",WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none"}}>
	      <div className="absolute inset-0 flex pointer-events-none overflow-hidden rounded-md">{(thumbs.length?thumbs:Array.from({length:18})).map((f,i)=><div key={i} className="flex-1 min-w-0 border-r border-black/30 bg-white/5">{f&&<img src={f} alt="" draggable={false} className="w-full h-full object-cover"/>}</div>)}</div>
	      {clipItems.map((clip)=>{const total=Math.max(.001,end-trimStart);const left=((clip.start-trimStart)/total)*100;const width=((clip.end-clip.start)/total)*100;const isSelected=selected?.id===clip.id;return <button key={clip.id} type="button" aria-label={`Clip ${label(clip.start)} à ${label(clip.end)}`} onClick={(e)=>{e.stopPropagation();setSelected({id:clip.id,start:clip.start,end:clip.end});seek(clip.start)}} className="absolute top-0 bottom-0 z-20" style={{left:`${left}%`,width:`${width}%`,border:isSelected?"2px solid white":"2px solid transparent",background:"transparent",borderRadius:6,padding:0}}/>})}
	      {removed.map((r,i)=><div key={i} className="absolute inset-y-0 bg-black/75 pointer-events-none z-10" style={{left:`${((r.start-trimStart)/Math.max(.001,end-trimStart))*100}%`,width:`${((r.end-r.start)/Math.max(.001,end-trimStart))*100}%`}}/>)}
      {splits.map(x=><div key={x} className="absolute inset-y-0 w-[2px] bg-white/70 pointer-events-none z-30" style={{left:`${((x-trimStart)/Math.max(.001,end-trimStart))*100}%`}}/>)}
      <div className="absolute top-0 bottom-0 w-[3px] bg-white z-40 pointer-events-none" style={{left:`${pct}%`}}/><div className="absolute -top-2 -translate-x-1/2 w-6 h-6 rounded-full bg-white z-50 pointer-events-none" style={{left:`${pct}%`}}/>
    </div><div className="flex justify-between text-[11px] text-white/60 mt-1 px-1"><span>{label(trimStart)}</span><span>{label(end)}</span></div></div>
    <div className="h-10 border-t border-white/10 flex items-center text-sm text-white/80"><span className="mr-3">♫</span><span>Ajouter un son</span></div></div></div>
  <div className="shrink-0 border-t border-white/10 bg-black px-2 py-3 pb-[max(12px,env(safe-area-inset-bottom))]"><div className="grid grid-cols-4 gap-1"><button onClick={split} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Diviser"><Scissors size={20}/><span className="text-[11px]">Diviser</span></button><button onClick={del} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer"><Trash2 size={20}/><span className="text-[11px]">Supprimer</span></button><button onClick={before} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer avant"><span className="text-lg leading-none">◀</span><span className="text-[11px]">Avant</span></button><button onClick={after} className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg active:bg-white/10" aria-label="Supprimer après"><span className="text-lg leading-none">▶</span><span className="text-[11px]">Après</span></button></div></div>
 </div>;
}
