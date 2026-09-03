import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Music, RefreshCw, Zap, ZapOff, Timer, Gauge, Layout, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { AudioPlayer } from "@/services/audioService";
import { EffectsPanel, AREffect } from './EffectsPanel';
import { AREngineMobile as AREngine } from './AREngineMobile';
import { LiveEntryButton } from '@/features/live/LiveEntryButton';

interface CameraRecorderProps { onVideoRecorded?: (blob: Blob, duration: number) => void; onPhotoTaken?: (blob: Blob) => void; onClose?: () => void; onOpenMusic?: () => void; onOpenEffects?: () => void; onPublish?: () => void; selectedMusic?: { name: string; url: string } | null; }
const SPEED_OPTIONS=['0.5x','1x','1.5x','2x'];

export const CameraRecorder:React.FC<CameraRecorderProps>=({onVideoRecorded,onPhotoTaken,onClose,onOpenMusic,onPublish,selectedMusic})=>{
 const videoRef=useRef<HTMLVideoElement>(null);
 const processedCanvasRef=useRef<HTMLCanvasElement|null>(null);
 const mediaRecorderRef=useRef<MediaRecorder|null>(null);
 const recordingCanvasStreamRef=useRef<MediaStream|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const musicPlayerRef=useRef<AudioPlayer|null>(null);
 const audioContextRef=useRef<AudioContext|null>(null);
 const musicElementRef=useRef<HTMLAudioElement|null>(null);
 const recordingStartedAtRef=useRef(0);
 const [isRecording,setIsRecording]=useState(false),[facingMode,setFacingMode]=useState<"user"|"environment">("user"),[selectedDuration,setSelectedDuration]=useState('15 s'),[recordingTime,setRecordingTime]=useState(0),[flashEnabled,setFlashEnabled]=useState(false),[activeSpeed,setActiveSpeed]=useState('1x'),[timerValue,setTimerValue]=useState(0),[timerCountdown,setTimerCountdown]=useState(0),[isTimerActive,setIsTimerActive]=useState(false),[activeAREffect,setActiveAREffect]=useState<AREffect|null>(null),[showAREffectsPanel,setShowAREffectsPanel]=useState(false);

 const toggleFlash=async()=>{const n=!flashEnabled;setFlashEnabled(n);const t=streamRef.current?.getVideoTracks()[0];if(!t)return;const c=t.getCapabilities() as any;if(c.torch)try{await t.applyConstraints({advanced:[{torch:n}]} as any)}catch(e){console.error(e)}else toast.info("Le flash n'est pas supporté sur cet appareil")};
 const handleAREffectSelect=(e:AREffect|null)=>{setActiveAREffect(e);setShowAREffectsPanel(true);if(e)toast.info(`Effet AR "${e.name}" activé`)};
 const startTimer=useCallback((d:number):Promise<void>=>new Promise(r=>{setIsTimerActive(true);setTimerCountdown(d);let n=d;const i=setInterval(()=>{n--;setTimerCountdown(n);if(n<=0){clearInterval(i);setIsTimerActive(false);r()}},1000)}),[]);
 useEffect(()=>{if(!selectedMusic){musicPlayerRef.current?.stop();return}musicPlayerRef.current=new AudioPlayer(selectedMusic.url);return()=>musicPlayerRef.current?.stop()},[selectedMusic]);
 const startCamera=useCallback(async()=>{try{streamRef.current?.getTracks().forEach(t=>t.stop());const s=await navigator.mediaDevices.getUserMedia({video:{facingMode,width:{ideal:1280},height:{ideal:720}},audio:true});streamRef.current=s;if(videoRef.current){videoRef.current.srcObject=s;await videoRef.current.play().catch(()=>{})}}catch{toast.error('Erreur caméra')}},[facingMode]);
 useEffect(()=>{startCamera();return()=>streamRef.current?.getTracks().forEach(t=>t.stop())},[startCamera]);

 const takeProcessedPhoto=useCallback(()=>{
   const source=processedCanvasRef.current;
   if(!source||source.width<2||source.height<2){toast.error("La caméra n'est pas encore prête");return;}
   source.toBlob(blob=>{if(blob)onPhotoTaken?.(blob)},'image/jpeg',.95);
 },[onPhotoTaken]);

 const stopRecording=useCallback(()=>{mediaRecorderRef.current?.stop();setIsRecording(false)},[]);

 const handleCapture=async()=>{
   if(timerValue>0&&!isRecording)await startTimer(timerValue);
   if(selectedDuration==='PHOTO'){takeProcessedPhoto();return}
   if(isRecording){stopRecording();return}
   const processedCanvas=processedCanvasRef.current;
   if(!processedCanvas||processedCanvas.width<2||processedCanvas.height<2){toast.error("La caméra avec effets n'est pas encore prête");return}
   if(!streamRef.current){toast.error("Caméra indisponible");return}

   const canvasStream=processedCanvas.captureStream(30);
   recordingCanvasStreamRef.current=canvasStream;
   const ac=new AudioContext();
   audioContextRef.current=ac;
   const d=ac.createMediaStreamDestination();
   const micSource=ac.createMediaStreamSource(streamRef.current);
   micSource.connect(d);

   let me:HTMLAudioElement|null=null;
   if(selectedMusic){
     me=new Audio(selectedMusic.url);
     me.crossOrigin='anonymous';
     musicElementRef.current=me;
     const ms=ac.createMediaElementSource(me);
     ms.connect(d);
     ms.connect(ac.destination);
   }

   const mixed=new MediaStream();
   canvasStream.getVideoTracks().forEach(t=>mixed.addTrack(t));
   d.stream.getAudioTracks().forEach(t=>mixed.addTrack(t));
   const chunks:Blob[]=[];
   const opt=MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')?{mimeType:'video/webm;codecs=vp8,opus'}:{mimeType:'video/webm'};
   const mr=new MediaRecorder(mixed,opt);
   mr.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data)};
   mr.onstop=()=>{
     musicElementRef.current?.pause();
     audioContextRef.current?.close();
     recordingCanvasStreamRef.current?.getTracks().forEach(t=>t.stop());
     recordingCanvasStreamRef.current=null;
     const duration=Math.max(0,Math.round((performance.now()-recordingStartedAtRef.current)/1000));
     onVideoRecorded?.(new Blob(chunks,{type:mr.mimeType||'video/webm'}),duration);
   };
   mr.onerror=()=>{toast.error("Impossible d'enregistrer la vidéo avec l'effet");setIsRecording(false)};
   mr.start(1000);
   mediaRecorderRef.current=mr;
   recordingStartedAtRef.current=performance.now();
   if(me){await ac.resume();me.currentTime=0;me.playbackRate=parseFloat(activeSpeed.replace('x',''));me.play().catch(()=>{})}
   if(videoRef.current)videoRef.current.playbackRate=parseFloat(activeSpeed.replace('x',''));
   setIsRecording(true);setRecordingTime(0);
 };

 useEffect(()=>{let i:NodeJS.Timeout;if(isRecording)i=setInterval(()=>setRecordingTime(p=>p+1),1000);return()=>clearInterval(i)},[isRecording]);
 useEffect(()=>{if(!isRecording)return;const m=selectedDuration==='10 min'?600:selectedDuration==='60 s'?60:15;if(recordingTime>=m){stopRecording()}},[recordingTime,isRecording,selectedDuration,stopRecording]);
 useEffect(()=>()=>{mediaRecorderRef.current?.stop();recordingCanvasStreamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current?.getTracks().forEach(t=>t.stop());audioContextRef.current?.close()},[]);

 return <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
   <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"/>
   <AREngine videoRef={videoRef} activeEffect={activeAREffect} isRecording={isRecording} canvasRef={processedCanvasRef}/>
   {isRecording&&<div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-30"><div className="h-full bg-yellow-400" style={{width:`${(recordingTime/(selectedDuration==='10 min'?600:selectedDuration==='60 s'?60:15))*100}%`}}/></div>}
   {isTimerActive&&<div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40"><div className="text-8xl font-bold">{timerCountdown}</div></div>}
   <div className="relative p-4 flex justify-between items-start z-20"><button onClick={onClose}><X size={28}/></button><button onClick={onOpenMusic} className="bg-black/30 px-4 py-2 rounded-full flex items-center gap-2"><Music size={16}/>Ajouter un son</button><div className="flex flex-col gap-5 items-center"><button onClick={()=>setFacingMode(f=>f==='user'?'environment':'user')}><RefreshCw size={22}/><span className="text-[10px]">Retourner</span></button><button onClick={()=>{const i=SPEED_OPTIONS.indexOf(activeSpeed);const n=SPEED_OPTIONS[(i+1)%SPEED_OPTIONS.length];setActiveSpeed(n);if(videoRef.current)videoRef.current.playbackRate=parseFloat(n.replace('x',''))}}><Gauge size={22}/><span className="text-[10px]">{activeSpeed}</span></button><button onClick={()=>setTimerValue(v=>v===0?3:v===3?5:10)}><Timer size={22}/><span className="text-[10px]">{timerValue?`${timerValue}s`:'Retardateur'}</span></button><button onClick={toggleFlash}>{flashEnabled?<Zap/>:<ZapOff/>}<span className="text-[10px]">Flash</span></button><button onClick={()=>toast.info("Enregistrez d'abord une vidéo pour accéder au montage")}><Layout size={22}/><span className="text-[10px]">Montage</span></button></div></div>
   <div className={`absolute left-0 right-0 z-20 ${showAREffectsPanel?'bottom-[280px]':'bottom-[60px]'}`}><div className="flex justify-start gap-3 overflow-x-auto px-6 pb-2 snap-x snap-mandatory scrollbar-hide" role="tablist" aria-label="Choisir le type et la durée" style={{ scrollbarWidth: 'none' }}>{['PHOTO','15 s','60 s','10 min'].map(d=><button key={d} role="tab" aria-selected={selectedDuration===d} onClick={()=>setSelectedDuration(d)} className={`shrink-0 min-w-[88px] snap-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${selectedDuration===d ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-white/40 bg-black/50 text-white'}`}>{d === 'PHOTO' ? 'Photo' : `Vidéo ${d}`}</button>)}</div><div className="flex justify-center mt-3"><div className="w-20 h-20 rounded-full border-[5px] border-white p-1.5"><button onClick={handleCapture} className="w-full h-full bg-red-500 rounded-full"/></div></div></div>
   {showAREffectsPanel&&<div className="absolute bottom-[50px] left-0 right-0 z-40"><EffectsPanel selectedEffect={activeAREffect} onSelectEffect={handleAREffectSelect}/></div>}
   <div className="absolute bottom-0 left-0 right-0 z-30 bg-black flex items-center px-4 h-[50px]"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 via-red-500 to-purple-600"/><button onClick={()=>setShowAREffectsPanel(v=>!v)} className="flex-1 mx-4 py-2.5 rounded-full font-bold"><Palette size={16}/>Effets</button><div className="flex gap-3"><LiveEntryButton className="px-3 py-2 text-sm"/><button onClick={()=>onPublish?.()}>PUBLIER</button><button onClick={()=>onOpenMusic?.()}>CRÉER</button></div></div>
 </div>;
};
export default CameraRecorder;
