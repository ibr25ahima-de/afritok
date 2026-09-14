import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Pause, Undo2, Redo2, Maximize2, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Range = { start: number; end: number };
type Props = { src:string; duration:number; trimStart:number; trimEnd:number; cuts:Range[]; onTrimChange:(start:number,end:number)=>void; onCutsChange:(cuts:Range[])=>void; onCurrentTimeChange?:(time:number)=>void; onClose:()=>void };

const fmt=(v:number)=>{const s=Math.max(0,Math.floor(v));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`};

export function ClipEditorFixed({src,duration,trimStart,trimEnd,cuts,onTrimChange,onCutsChange,onCurrentTimeChange,onClose}:Props){
  const videoRef=useRef<HTMLVideoElement>(null);
  const timelineRef=useRef<HTMLDivElement>(null);
  const [time,setTime]=useState(trimStart);
  const [playing,setPlaying]=useState(false);
  const [thumbs,setThumbs]=useState<string[]>([]);
  const [splits,setSplits]=useState<number[]>([]);
  const [selected,setSelected]=useState<Range|null>(null);
  const [drag,setDrag]=useState<"cursor"|"start"|"end"|null>(null);
  const [history,setHistory]=useState<{cuts:Range[];splits:number[];start:number;end:number}[]>([]);
  const [future,setFuture]=useState<{cuts:Range[];splits:number[];start:number;end:number}[]>([]);
  const end=trimEnd||duration;

  const removed=useMemo(()=>[...cuts].sort((a,b)=>a.start-b.start),[cuts]);
  const points=useMemo(()=>[trimStart,...splits.filter(p=>p>trimStart+.05&&p<end-.05),end].sort((a,b)=>a-b),[trimStart,end,splits]);
  const clips=useMemo(()=>{
    const out:Range[]=[];
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1];
      if(b-a<.05)continue;
      if(!removed.some(r=>a>=r.start-.02&&b<=r.end+.02))out.push({start:a,end:b});
    }
    return out;
  },[points,removed]);

  const save=()=>{setHistory(h=>[...h.slice(-19),{cuts:cuts.map(x=>({...x})),splits:[...splits],start:trimStart,end}]);setFuture([])};
  const go=(value:number)=>{
    const value2=Math.max(trimStart,Math.min(value,end));
    const blocked=removed.find(r=>value2>=r.start&&value2<r.end);
    const target=blocked?Math.min(blocked.end+.001,end):value2;
    if(videoRef.current)videoRef.current.currentTime=target;
    setTime(target);onCurrentTimeChange?.(target);
  };
  const fromX=(x:number)=>{
    const el=timelineRef.current;if(!el||duration<=0)return trimStart;
    const r=el.getBoundingClientRect();
    return Math.max(0,Math.min(duration,(x-r.left)/r.width*duration));
  };

  const startDrag=(mode:"cursor"|"start"|"end",x:number)=>{
    setDrag(mode);
    const v=fromX(x);
    if(mode==="cursor")go(v);
    if(mode==="start"){const n=Math.min(v,end-.1);onTrimChange(Math.max(0,n),end);go(n)}
    if(mode==="end"){const n=Math.max(trimStart+.1,Math.min(v,duration));onTrimChange(trimStart,n);go(n)}
  };
  const move=(x:number)=>{
    if(!drag)return;
    const v=fromX(x);
    if(drag==="cursor")go(v);
    else if(drag==="start"){const n=Math.min(Math.max(0,v),end-.1);onTrimChange(n,end);go(n)}
    else {const n=Math.max(trimStart+.1,Math.min(v,duration));onTrimChange(trimStart,n);go(n)}
  };

  useEffect(()=>{
    const mv=(e:PointerEvent)=>move(e.clientX),up=()=>setDrag(null);
    window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);
    return()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up)};
  });

  useEffect(()=>{
    const v=videoRef.current;if(!v)return;
    const loaded=()=>{v.currentTime=trimStart};
    const tick=()=>{
      const t=v.currentTime,cut=removed.find(r=>t>=r.start&&t<r.end);
      if(cut){v.currentTime=Math.min(cut.end+.001,end);return}
      if(t>=end-.03){v.pause();setPlaying(false);return}
      if(t>=trimStart){setTime(t);onCurrentTimeChange?.(t)}
    };
    const p=()=>setPlaying(true),q=()=>setPlaying(false);
    v.addEventListener("loadedmetadata",loaded);v.addEventListener("timeupdate",tick);v.addEventListener("play",p);v.addEventListener("pause",q);
    return()=>{v.removeEventListener("loadedmetadata",loaded);v.removeEventListener("timeupdate",tick);v.removeEventListener("play",p);v.removeEventListener("pause",q)};
  },[src,trimStart,end,removed,onCurrentTimeChange]);

  useEffect(()=>{
    let cancelled=false;const v=document.createElement("video");v.src=src;v.muted=true;v.playsInline=true;v.preload="metadata";
    const wait=()=>new Promise<void>((resolve,reject)=>{if(v.readyState>=1)return resolve();const ok=()=>{clean();resolve()},bad=()=>{clean();reject(new Error())},clean=()=>{v.removeEventListener("loadedmetadata",ok);v.removeEventListener("error",bad)};v.addEventListener("loadedmetadata",ok,{once:true});v.addEventListener("error",bad,{once:true})});
    const seek=(t:number)=>new Promise<void>(resolve=>{let done=false;const f=()=>{if(done)return;done=true;v.removeEventListener("seeked",f);resolve()};v.addEventListener("seeked",f,{once:true});v.currentTime=t;setTimeout(f,600)});
    (async()=>{try{await wait();const c=document.createElement("canvas");c.width=240;c.height=135;const ctx=c.getContext("2d");if(!ctx)return;const out:string[]=[];const total=v.duration||duration;for(let i=0;i<18;i++){if(cancelled)return;await seek(total*i/17);ctx.drawImage(v,0,0,c.width,c.height);out.push(c.toDataURL("image/jpeg",.58))}if(!cancelled)setThumbs(out)}catch{}})();
    return()=>{cancelled=true;v.removeAttribute("src");v.load()};
  },[src,duration]);

  const splitHere=()=>{
    const clip=clips.find(c=>time>=c.start-.01&&time<=c.end+.01);
    if(!clip||time<=clip.start+.08||time>=clip.end-.08){toast.info("Déplace la ligne blanche exactement à l'endroit de la coupe");return}
    if(splits.some(p=>Math.abs(p-time)<.08)){toast.info("La vidéo est déjà divisée ici");return}
    save();setSplits(p=>[...p,time].sort((a,b)=>a-b));setSelected({start:clip.start,end:time});toast.success("Vidéo divisée")
  };
  const deleteSelected=()=>{
    const clip=selected||clips.find(c=>time>=c.start&&time<c.end);
    if(!clip){toast.info("Sélectionne une partie de la vidéo");return}
    if(clips.length<=1){toast.info("Garder au moins 1 clip");return}
    save();onCutsChange([...cuts,{start:clip.start,end:clip.end}]);setSplits(p=>p.filter(x=>Math.abs(x-clip.start)>.05&&Math.abs(x-clip.end)>.05));
    const next=clips.find(c=>c.start>clip.end+.02)||clips.find(c=>c.end<clip.start-.02)||null;setSelected(next);go(next?.start??trimStart);toast.success("Partie supprimée")
  };
  const deleteBefore=()=>{if(time<=trimStart+.05){toast.info("Déplace la ligne blanche vers la droite");return}save();onTrimChange(time,end);onCutsChange(cuts.filter(c=>c.end>time));setSplits(p=>p.filter(x=>x>time+.05));go(time);toast.success("Partie avant supprimée")};
  const deleteAfter=()=>{if(time>=end-.05){toast.info("Déplace la ligne blanche vers la gauche");return}save();onTrimChange(trimStart,time);onCutsChange(cuts.filter(c=>c.start<time));setSplits(p=>p.filter(x=>x<time-.05));go(Math.max(trimStart,time-.02));toast.success("Partie après supprimée")};
  const undo=()=>{const h=history.at(-1);if(!h)return;setFuture(f=>[...f,{cuts:cuts.map(x=>({...x})),splits:[...splits],start:trimStart,end}]);setHistory(hs=>hs.slice(0,-1));onCutsChange(h.cuts);onTrimChange(h.start,h.end);setSplits(h.splits);setSelected(null);go(h.start)};
  const redo=()=>{const h=future.at(-1);if(!h)return;setHistory(hs=>[...hs,{cuts:cuts.map(x=>({...x})),splits:[...splits],start:trimStart,end}]);setFuture(fs=>fs.slice(0,-1));onCutsChange(h.cuts);onTrimChange(h.start,h.end);setSplits(h.splits);setSelected(null);go(h.start)};
  const playToggle=()=>{const v=videoRef.current;if(!v)return;if(v.paused)v.play().catch(()=>{});else v.pause()};

  const head=duration?time/duration*100:0,left=duration?trimStart/duration*100:0,right=duration?end/duration*100:100;

  return <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden">
    <header className="h-14 shrink-0 flex items-center justify-between px-3"><button onClick={onClose} className="w-10 h-10 flex items-center justify-center"><ArrowLeft size={26}/></button><span className="font-semibold text-sm">Modifier</span><button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400"><Check size={27}/></button></header>
    <div className="flex-1 min-h-0 flex flex-col justify-center">
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-2"><video ref={videoRef} src={src} playsInline className="max-h-full max-w-full object-contain" onClick={playToggle}/></div>
      <div className="shrink-0 px-3">
        <div className="h-11 flex items-center justify-center gap-6 text-white/85"><span className="text-sm tabular-nums">{fmt(time)} / {fmt(Math.max(0,end-trimStart))}</span><button onClick={playToggle}>{playing?<Pause size={20}/>:<Play size={20} fill="white"/>}</button><button onClick={undo} disabled={!history.length} className="disabled:opacity-25"><Undo2 size={20}/></button><button onClick={redo} disabled={!future.length} className="disabled:opacity-25"><Redo2 size={20}/></button><button onClick={()=>videoRef.current?.requestFullscreen?.()}><Maximize2 size={19}/></button></div>
        <div className="pb-3">
          <div ref={timelineRef} className="relative h-[76px] rounded-md bg-white/10 select-none overflow-visible" style={{touchAction:"none"}}
            onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture?.(e.pointerId);const t=fromX(e.clientX);const clip=clips.find(c=>t>=c.start&&t<c.end);setSelected(clip||null);startDrag("cursor",e.clientX)}}
            onPointerMove={e=>{if(e.currentTarget.hasPointerCapture?.(e.pointerId))move(e.clientX)}}
            onPointerUp={e=>{e.currentTarget.releasePointerCapture?.(e.pointerId);setDrag(null)}}
            onPointerCancel={()=>setDrag(null)}>
            <div className="absolute inset-0 flex pointer-events-none">{(thumbs.length?thumbs:Array.from({length:18})).map((t,i)=><div key={i} className="flex-1 min-w-0 border-r border-black/25">{t&&<img src={t} alt="" draggable={false} className="w-full h-full object-cover"/>}</div>)}</div>
            {activeCuts(removed,duration).map((r,i)=><div key={i} className="absolute inset-y-0 bg-black/75 pointer-events-none" style={{left:`${r.start/duration*100}%`,width:`${(r.end-r.start)/duration*100}%`}}/>)}
            {clips.map((c,i)=>{const is=selected&&Math.abs(selected.start-c.start)<.03&&Math.abs(selected.end-c.end)<.03;return <div key={i} className={`absolute inset-y-0 border-2 pointer-events-none ${is?"border-white":"border-transparent"}`} style={{left:`${c.start/duration*100}%`,width:`${(c.end-c.start)/duration*100}%`}}/>})}
            {splits.map(p=><div key={p} className="absolute top-0 bottom-0 w-[2px] bg-white/90 z-20 pointer-events-none" style={{left:`${p/duration*100}%`}}/>)}
            <div className="absolute top-0 bottom-0 w-[3px] bg-white z-30 pointer-events-none" style={{left:`${head}%`}}/><div className="absolute -top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-white z-40 pointer-events-none" style={{left:`${head}%`}}/>
            <button type="button" aria-label="Début" className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-50 bg-white rounded-l-md cursor-ew-resize" style={{left:`${left}%`,touchAction:"none"}} onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture?.(e.pointerId);setDrag("start")}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture?.(e.pointerId))move(e.clientX)}} onPointerUp={()=>setDrag(null)}/>
            <button type="button" aria-label="Fin" className="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-50 bg-white rounded-r-md cursor-ew-resize" style={{left:`${right}%`,touchAction:"none"}} onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture?.(e.pointerId);setDrag("end")}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture?.(e.pointerId))move(e.clientX)}} onPointerUp={()=>setDrag(null)}/>
          </div>
          <div className="flex justify-between text-[11px] text-white/60 mt-1 px-1"><span>{fmt(trimStart)}</span><span>{fmt(end)}</span></div>
        </div>
        <div className="h-10 border-t border-white/10 flex items-center text-sm text-white/80"><span className="mr-3">♫</span><span>Ajouter un son</span></div>
      </div>
    </div>
    <div className="shrink-0 border-t border-white/10 bg-black px-2 py-3"><div className="flex items-center gap-2 overflow-x-auto pb-1"><button onClick={splitHere} className="min-w-[78px] flex flex-col items-center gap-1 text-xs"><Scissors size={21}/><span>Diviser</span></button><button onClick={deleteSelected} className="min-w-[86px] flex flex-col items-center gap-1 text-xs"><Trash2 size={21}/><span>Supprimer</span></button><button onClick={deleteBefore} className="min-w-[100px] flex flex-col items-center gap-1 text-xs"><span className="text-lg">◀</span><span>Supprimer avant</span></button><button onClick={deleteAfter} className="min-w-[100px] flex flex-col items-center gap-1 text-xs"><span className="text-lg">▶</span><span>Supprimer après</span></button></div></div>
  </div>;
}

function activeCuts(cuts:Range[],duration:number){return cuts.map(c=>({start:Math.max(0,c.start),end:Math.min(duration,c.end)})).filter(c=>c.end>c.start+.02)}
