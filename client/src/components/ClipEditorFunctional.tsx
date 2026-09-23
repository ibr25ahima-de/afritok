import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Range={start:number;end:number};
type Props={src:string;duration:number;trimStart:number;trimEnd:number;cuts:Range[];onTrimChange:(s:number,e:number)=>void;onCutsChange:(c:Range[])=>void;onCurrentTimeChange?:(t:number)=>void;onClose:()=>void};
const fmt=(n:number)=>{n=Math.max(0,Math.floor(Number.isFinite(n)?n:0));return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`};
const merge=(a:Range[])=>a.filter(r=>r.end-r.start>.05).sort((x,y)=>x.start-y.start).reduce<Range[]>((o,r)=>{const l=o[o.length-1];if(l&&r.start<=l.end+.03)l.end=Math.max(l.end,r.end);else o.push({...r});return o},[]);

export function ClipEditorFunctional({src,duration,trimStart,trimEnd,cuts,onTrimChange,onCutsChange,onCurrentTimeChange,onClose}:Props){
 const vref=useRef<HTMLVideoElement>(null);const tref=useRef<HTMLDivElement>(null);const tRef=useRef(trimStart||0);const dragRef=useRef(false);const dragOriginRef=useRef<number|null>(null);const lastDragOriginRef=useRef<number|null>(null);const activePointerIdRef=useRef<number|null>(null);const dragModeRef=useRef<"playhead"|"start"|"end">("playhead");
 const [d,setD]=useState(duration>0?duration:0),[t,setT]=useState(trimStart||0),[playing,setPlaying]=useState(false),[splits,setSplits]=useState<number[]>([]),[thumbs,setThumbs]=useState<string[]>([]),[history,setHistory]=useState<any[]>([]),[future,setFuture]=useState<any[]>([]),[ready,setReady]=useState(false),[selecting,setSelecting]=useState(false);
 const total=d>0?d:duration;const start=Math.max(0,Math.min(trimStart||0,total||0));const end=Math.max(start,Math.min(trimEnd>0?trimEnd:total,total||trimEnd||start));const removed=useMemo(()=>merge(cuts),[cuts]);
 const bounds=useMemo(()=>[start,...splits.filter(x=>x>start+.05&&x<end-.05),end].sort((a,b)=>a-b),[start,end,splits]);
 const clips=useMemo(()=>bounds.slice(0,-1).map((a,i)=>({start:a,end:bounds[i+1]})).filter(c=>c.end-c.start>.05&&!removed.some(r=>c.start>=r.start-.02&&c.end<=r.end+.02)),[bounds,removed]);
 const pct=((t-start)/Math.max(.001,end-start))*100;
 const seek=(raw:number,notify=true)=>{const safe=Math.max(start,Math.min(raw,end));const cut=removed.find(r=>safe>=r.start&&safe<r.end);const target=cut?Math.min(cut.end+.001,end):safe;tRef.current=target;setT(target);if(notify)onCurrentTimeChange?.(target);const v=vref.current;if(v&&Math.abs(v.currentTime-target)>.01){try{v.currentTime=target}catch{}}};
 useEffect(()=>{const v=vref.current;if(!v)return;const readyFn=()=>{if(!Number.isFinite(v.duration)||v.duration<=0)return;setD(v.duration);setReady(true);if(trimEnd<=0)onTrimChange(trimStart||0,v.duration);const initial=Math.min(Math.max(tRef.current||trimStart||0,trimStart||0),trimEnd>0?trimEnd:v.duration);try{v.currentTime=initial}catch{};tRef.current=initial;setT(initial)};const time=()=>{const x=v.currentTime;const cut=removed.find(r=>x>=r.start&&x<r.end);if(cut){try{v.currentTime=Math.min(cut.end+.001,end)}catch{};return}if(end>start&&x>=end-.03){v.pause();setPlaying(false);seek(end,false);return}if(!dragRef.current){tRef.current=x;setT(x)}};const play=()=>setPlaying(true),pause=()=>setPlaying(false),err=()=>{setReady(false);toast.error("La vidéo ne peut pas être lue dans le montage")};v.addEventListener("loadedmetadata",readyFn);v.addEventListener("loadeddata",readyFn);v.addEventListener("canplay",readyFn);v.addEventListener("timeupdate",time);v.addEventListener("play",play);v.addEventListener("pause",pause);v.addEventListener("error",err);if(v.readyState>=1)readyFn();return()=>{v.removeEventListener("loadedmetadata",readyFn);v.removeEventListener("loadeddata",readyFn);v.removeEventListener("canplay",readyFn);v.removeEventListener("timeupdate",time);v.removeEventListener("play",play);v.removeEventListener("pause",pause);v.removeEventListener("error",err)}},[src,end,removed,trimEnd,trimStart,onTrimChange]);
 useEffect(() => {
  let stop = false;
  const v = document.createElement("video");
  v.src = src; v.muted = true; v.playsInline = true; v.preload = "auto";
  v.style.position = "fixed"; v.style.width = "2px"; v.style.height = "2px"; v.style.opacity = "0"; v.style.pointerEvents = "none"; v.style.left = "-9999px";
  document.body.appendChild(v);
  const readyP = new Promise<void>((r) => { if (v.readyState >= 1) r(); else v.addEventListener("loadedmetadata", () => r(), { once: true }); });
  const seekThumb = (x: number) => new Promise<void>((r) => { let done = false; const f = () => { if (done) return; done = true; v.removeEventListener("seeked", f); r(); }; v.addEventListener("seeked", f, { once: true }); try { v.currentTime = x; } catch {} setTimeout(f, 800); });
  (async () => { try { await readyP; if (stop) return; const c = document.createElement("canvas"), ctx = c.getContext("2d"); if (!ctx) return; c.width = 120; c.height = 68; const out: string[] = []; const span = Math.max(0.1, end - start); for (let i = 0; i < 18 && !stop; i++) { await seekThumb(start + (span * i) / 17); ctx.drawImage(v, 0, 0, c.width, c.height); out.push(c.toDataURL("image/jpeg", 0.55)); } if (!stop) setThumbs(out); } catch {} })();
  return () => { stop = true; v.pause(); v.removeAttribute("src"); v.load(); document.body.removeChild(v); };
 }, [src, start, end]);
 const remember=()=>{setHistory(h=>[...h,{cuts:cuts.map(x=>({...x})),splits:[...splits],start,end}]);setFuture([])};
 const split=()=>{const x=tRef.current;if(x<=start+.08||x>=end-.08)return toast.info("Place la ligne blanche à l'endroit de la coupe");if(splits.some(s=>Math.abs(s-x)<.08))return;remember();setSplits(s=>[...s,x].sort((a,b)=>a-b));seek(x);toast.success("Vidéo divisée")};
 const del=()=>{const x=tRef.current;const c=clips.find(q=>x>=q.start-.001&&x<q.end-.001);if(!c)return toast.info("Place la ligne blanche sur la partie à supprimer");if(clips.length<=1)return toast.info("Garde au moins une partie de la vidéo");remember();onCutsChange(merge([...cuts,c]));setSplits(s=>s.filter(x=>x<=c.start+.05||x>=c.end-.05));const next=clips.find(q=>q.start>=c.end-.02);const target=next?.start??start;seek(target);toast.success("Partie supprimée")};
 const removeSide=()=>{const x=tRef.current;const origin=lastDragOriginRef.current??start;if(x<=start+.05||x>=end-.05)return toast.info("Glisse d'abord le doigt jusqu'à l'endroit où couper");if(x>=origin){remember();onTrimChange(x,end);onCutsChange(cuts.filter(r=>r.end>x));setSplits(s=>s.filter(q=>q>x+.05));seek(x)}else{remember();onTrimChange(start,x);onCutsChange(cuts.filter(r=>r.start<x));setSplits(s=>s.filter(q=>q<x-.05));seek(Math.max(start,x-.01))}toast.success("Partie supprimée")};
 const front=()=>{const x=tRef.current;if(x<=start+.05||x>=end-.05)return toast.info("Place la ligne blanche après le début");remember();onTrimChange(x,end);onCutsChange(cuts.filter(r=>r.end>x));setSplits(s=>s.filter(q=>q>x+.05));seek(x);toast.success("Début supprimé")};
 const back=()=>{const x=tRef.current;if(x<=start+.05||x>=end-.05)return toast.info("Place la ligne blanche avant la fin");remember();onTrimChange(start,x);onCutsChange(cuts.filter(r=>r.start<x));setSplits(s=>s.filter(q=>q<x-.05));seek(Math.max(start,x-.01));toast.success("Fin supprimée")};
 const toggle=()=>{const v=vref.current;if(!v)return;if(v.paused){const target=(v.currentTime<start||v.currentTime>=end)?start:v.currentTime;try{v.currentTime=target}catch{};v.play().catch(()=>toast.info("Appuie sur Lire une seconde fois"))}else v.pause()};
 const move=(x:number)=>{const el=tref.current;if(!el)return;const r=el.getBoundingClientRect();if(r.width<=0)return;const safeEnd=end>start?end:total;const ratio=Math.max(0,Math.min(1,(x-r.left)/r.width));seek(start+ratio*Math.max(0.05,safeEnd-start))};
 const updateFromClientX=(x:number)=>{
   const el=tref.current;if(!el)return;
   const r=el.getBoundingClientRect();if(r.width<=0)return;
   const ratio=Math.max(0,Math.min(1,(x-r.left)/r.width));
   const value=start+ratio*Math.max(.05,end-start);
   if(dragModeRef.current==="start"){
     const next=Math.min(value,end-.1);
     onTrimChange(next,end);seek(next);
   }else if(dragModeRef.current==="end"){
     const next=Math.max(value,start+.1);
     onTrimChange(start,next);seek(Math.min(tRef.current,next));
   }else{
     seek(value);
   }
 };
 const pointerMoveWindow=(e:PointerEvent)=>{
   if(!dragRef.current||activePointerIdRef.current!==e.pointerId)return;
   e.preventDefault();updateFromClientX(e.clientX);
 };
 const pointerEndWindow=(e:PointerEvent)=>{
   if(activePointerIdRef.current!==e.pointerId)return;
   dragRef.current=false;dragOriginRef.current=null;activePointerIdRef.current=null;
   window.removeEventListener("pointermove",pointerMoveWindow);
   window.removeEventListener("pointerup",pointerEndWindow);
   window.removeEventListener("pointercancel",pointerEndWindow);
 };
 const pointerStart=(e:React.PointerEvent<HTMLDivElement>)=>{
   if(!selecting||dragRef.current)return;
   e.preventDefault();e.stopPropagation();
   const el=tref.current;if(!el)return;
   const r=el.getBoundingClientRect();
   const x=Math.max(0,Math.min(r.width,e.clientX-r.left));
   const startX=((start-start)/Math.max(.001,end-start))*r.width;
   const endX=r.width;
   const handleZone=28;
   dragModeRef.current=Math.abs(x-startX)<=handleZone?"start":Math.abs(x-endX)<=handleZone?"end":"playhead";
   activePointerIdRef.current=e.pointerId;
   dragRef.current=true;
   dragOriginRef.current=tRef.current;
   lastDragOriginRef.current=tRef.current;
   try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch{}
   vref.current?.pause();
   updateFromClientX(e.clientX);
   window.addEventListener("pointermove",pointerMoveWindow,{passive:false});
   window.addEventListener("pointerup",pointerEndWindow,{passive:false});
   window.addEventListener("pointercancel",pointerEndWindow,{passive:false});
 };
 const undo=()=>{const h=history[history.length-1];if(!h)return;setFuture(f=>[...f,{cuts:cuts.map(x=>({...x})),splits:[...splits],start,end}]);setHistory(hs=>hs.slice(0,-1));onCutsChange(h.cuts);onTrimChange(h.start,h.end);setSplits(h.splits);seek(h.start)};
 const redo=()=>{const h=future[future.length-1];if(!h)return;setHistory(hs=>[...hs,{cuts:cuts.map(x=>({...x})),splits:[...splits],start,end}]);setFuture(fs=>fs.slice(0,-1));onCutsChange(h.cuts);onTrimChange(h.start,h.end);setSplits(h.splits);seek(h.start)};
 return <div className="fixed inset-0 z-[110] h-[100dvh] min-h-0 bg-black text-white flex flex-col overflow-hidden"><header className="h-14 shrink-0 flex items-center justify-between px-3"><button onClick={onClose} className="w-10 h-10 flex items-center justify-center"><ArrowLeft size={26}/></button><b className="text-sm">Modifier la vidéo</b><button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400"><Check size={27}/></button></header><div className="flex-1 min-h-0 flex flex-col"><div className="flex-1 min-h-0 flex items-center justify-center relative px-2 py-2"><video ref={vref} src={src} muted playsInline preload="auto" controls={false} className="w-full h-full max-h-full object-contain" onClick={toggle}/>{!playing&&<button aria-label={ready?"Lire la vidéo":"Chargement de la vidéo"} onClick={toggle} disabled={!ready} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 h-16 w-16 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-40"><Play size={30} fill="white"/></button>}</div><div className="shrink-0 px-3"><div className="h-10 flex items-center justify-center gap-6"><span className="tabular-nums text-sm">{fmt(t-start)} / {fmt(end-start)}</span><button aria-label={playing?"Pause":"Lire"} onClick={toggle} disabled={!ready} className="disabled:opacity-40">{playing?<Pause size={21}/>:<Play size={21} fill="white"/>}</button><button onClick={undo} disabled={!history.length} className="disabled:opacity-25"><Undo2 size={20}/></button><button onClick={redo} disabled={!future.length} className="disabled:opacity-25"><Redo2 size={20}/></button></div><div className="pb-3"><div ref={tref} className="relative h-[84px] rounded-md overflow-hidden bg-white/10 select-none cursor-ew-resize" style={{touchAction:"none"}} onPointerDown={pointerStart}><div className="flex h-16 pointer-events-none">{(thumbs.length?thumbs:Array.from({length:18})).map((f,i)=><div key={i} className="flex-1 min-w-0 border-r border-black/30 bg-white/5">{f&&<img src={f} alt="" draggable={false} className="w-full h-16 object-cover"/>}</div>)}</div>{removed.map((r,i)=><div key={i} className="absolute inset-y-0 bg-black/75 pointer-events-none z-10" style={{left:`${(r.start-start)/Math.max(.001,end-start)*100}%`,width:`${(r.end-r.start)/Math.max(.001,end-start)*100}%`}}/>)}{splits.map(x=><div key={x} className="absolute inset-y-0 w-[2px] bg-white/80 pointer-events-none z-30" style={{left:`${(x-start)/Math.max(.001,end-start)*100}%`}}/>)}<div className="absolute inset-y-0 left-0 w-1 bg-white z-40 pointer-events-none" style={{width:`${selecting?Math.max(2,((start-start)/Math.max(.001,end-start))*100):0}%`}}/><div className={`absolute top-0 bottom-0 w-[3px] z-40 pointer-events-none ${selecting?"bg-white":"bg-white/40"}`} style={{left:`${Math.max(0,Math.min(100,pct))}%`}}/><div className={`absolute top-0 -translate-x-1/2 w-5 h-5 rounded-full z-50 pointer-events-none ${selecting?"bg-white":"bg-white/40"}`} style={{left:`${Math.max(0,Math.min(100,pct))}%`}}/><div className={`absolute top-0 bottom-0 w-1 bg-white z-40 pointer-events-none ${selecting?"opacity-100":"opacity-40"}`} style={{left:"0%"}}/><div className={`absolute top-0 bottom-0 w-1 bg-white z-40 pointer-events-none ${selecting?"opacity-100":"opacity-40"}`} style={{left:"100%"}}/><div className={`absolute -top-1 -translate-x-1/2 w-7 h-7 rounded-l-md border-2 border-black z-50 pointer-events-none ${selecting?"bg-white":"bg-white/40"}`} style={{left:"0%"}}/><div className={`absolute -top-1 -translate-x-1/2 w-7 h-7 rounded-r-md border-2 border-black z-50 pointer-events-none ${selecting?"bg-white":"bg-white/40"}`} style={{left:"100%"}}/></div><div className="flex justify-between text-[11px] text-white/60 mt-1"><span>00:00</span><span>{fmt(end-start)}</span></div></div></div></div><div className="shrink-0 border-t border-white/10 bg-black px-2 py-2 pb-[max(10px,env(safe-area-inset-bottom))]"><div className="grid grid-cols-3 gap-2 px-1"><button onClick={()=>setSelecting(s=>!s)} className={`min-w-0 rounded-xl px-2 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 ${selecting?"bg-white text-black":"bg-white/10"}`}><Scissors size={15}/>Modifier</button><button onClick={front} className="min-w-0 rounded-xl bg-white/10 px-2 py-2 text-[11px] font-semibold">Début</button><button onClick={back} className="min-w-0 rounded-xl bg-white/10 px-2 py-2 text-[11px] font-semibold">Fin</button><button onClick={split} className="min-w-0 rounded-xl bg-white/10 px-2 py-2 text-[11px] font-semibold flex items-center justify-center gap-1"><Scissors size={15}/>Diviser</button><button onClick={removeSide} className="min-w-0 rounded-xl bg-red-500/90 px-2 py-2 text-[11px] font-semibold flex items-center justify-center gap-1"><Trash2 size={15}/>Supprimer</button></div><p className="text-[10px] text-white/45 text-center mt-2">{selecting ? "Touchez la ligne blanche puis faites-la glisser • la vidéo en haut suit votre doigt" : "Appuyez sur Modifier pour activer la ligne blanche et le glissement"}</p></div></div>;
}