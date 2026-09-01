import React, { useCallback, useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "./EffectsPanel";
import { applyBeautyEffects } from "./beautyEffects";
import { smoothLandmarks, LM, getFaceGeometry, getPoints } from "./faceUtils";

interface AREngineProps { videoRef: React.RefObject<HTMLVideoElement | null>; activeEffect: AREffect | null; isRecording?: boolean; }
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const DETECTION_INTERVAL_MS = 50;
const DEFAULT_BEAUTY = {
  smoothSkin: 0.96,
  skinTexture: 0.92,
  brightenSkin: 0.12,
  darkCircles: 0.32,
  eyeBrilliance: 0.12,
  smileLines: 0.28,
  enlargeEyes: 0,
  slimFace: 0,
  whitenTeeth: 0,
  enlargeLips: 0,
  symmetry: 0,
};

function getCameraFilter(effect: AREffect | null) {
  if (!effect) return "none";
  const c = effect.beautyConfig ?? {};
  const s = c.smoothSkin ?? 0, b = c.brightenSkin ?? 0;
  return `brightness(${(1 + Math.min(.08,b*.12+s*.015)).toFixed(3)}) contrast(${(1-Math.min(.035,s*.02)).toFixed(3)}) saturate(${(1+Math.min(.08,b*.08)).toFixed(3)})`;
}

function applySkinPolish(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, buffer: HTMLCanvasElement) {
  const points = getPoints(landmarks, LM.faceOval, width, height);
  if (points.length < 3) return;
  const face = getFaceGeometry(landmarks,width,height);
  const pad = Math.max(12, Math.round(Math.min(face.width,face.height)*.07));
  const l=Math.max(0,Math.floor(face.left-pad)), t=Math.max(0,Math.floor(face.top-pad)), r=Math.min(width,Math.ceil(face.right+pad)), b=Math.min(height,Math.ceil(face.bottom+pad));
  const w=r-l,h=b-t; if(w<16||h<16)return;
  if(buffer.width!==w||buffer.height!==h){buffer.width=w;buffer.height=h;}
  const bc=buffer.getContext("2d"); if(!bc)return;
  bc.clearRect(0,0,w,h);
  bc.filter="blur(7px)";
  bc.drawImage(ctx.canvas,l,t,w,h,0,0,w,h);
  bc.filter="none";
  ctx.save();
  polygonFace(ctx,points);
  ctx.clip();
  // A stronger second low-frequency pass removes the appearance of small
  // spots/uneven texture while the original frame remains underneath.
  ctx.globalAlpha=.68;
  ctx.drawImage(buffer,l,t);
  ctx.restore();
}
function polygonFace(ctx:CanvasRenderingContext2D,points:{x:number;y:number}[]){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}

export const AREngine:React.FC<AREngineProps>=({videoRef,activeEffect})=>{
 const canvasRef=useRef<HTMLCanvasElement|null>(null), bufferRef=useRef<HTMLCanvasElement|null>(null), landmarkerRef=useRef<FaceLandmarker|null>(null);
 const animationRef=useRef<number|null>(null), previousRef=useRef<NormalizedLandmark[]|null>(null), lastDetect=useRef(0), lastTime=useRef(-1), initRef=useRef(false);
 const detect=useCallback((video:HTMLVideoElement,t:number)=>{
  const lm=landmarkerRef.current; if(!lm)return previousRef.current;
  if(t-lastDetect.current<DETECTION_INTERVAL_MS||video.currentTime===lastTime.current)return previousRef.current;
  lastDetect.current=t; lastTime.current=video.currentTime;
  try{const r=lm.detectForVideo(video,t); const cur=r.faceLandmarks?.[0]; if(cur)previousRef.current=smoothLandmarks(cur,previousRef.current,.58);}
  catch(e){console.error("[AREngine] detect error",e)} return previousRef.current;
 },[]);
 useEffect(()=>{let cancelled=false;(async()=>{if(initRef.current)return;initRef.current=true;try{const vision=await FilesetResolver.forVisionTasks(WASM_URL);const lm=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL_URL},runningMode:"VIDEO",numFaces:1,minFaceDetectionConfidence:.18,minFacePresenceConfidence:.18,minTrackingConfidence:.18});if(cancelled){lm.close();return}landmarkerRef.current=lm;console.log("[AREngine] ready") }catch(e){console.error("[AREngine] init failed",e)}finally{initRef.current=false}})();return()=>{cancelled=true;if(animationRef.current)cancelAnimationFrame(animationRef.current);landmarkerRef.current?.close();landmarkerRef.current=null;previousRef.current=null}},[]);
 const render=useCallback(()=>{const v=videoRef.current,c=canvasRef.current;if(!v||!c||v.readyState<2||!v.videoWidth){animationRef.current=requestAnimationFrame(render);return} if(c.width!==v.videoWidth||c.height!==v.videoHeight){c.width=v.videoWidth;c.height=v.videoHeight} const ctx=c.getContext("2d",{alpha:false});if(!ctx)return;const w=c.width,h=c.height;ctx.filter=getCameraFilter(activeEffect);ctx.drawImage(v,0,0,w,h);ctx.filter="none";const lm=detect(v,performance.now());if(lm?.length){if(!bufferRef.current)bufferRef.current=document.createElement("canvas");applySkinPolish(ctx,lm,w,h,bufferRef.current);applyBeautyEffects(ctx,lm,w,h,{...DEFAULT_BEAUTY,...(activeEffect?.beautyConfig??{})})}animationRef.current=requestAnimationFrame(render)},[videoRef,activeEffect,detect]);
 useEffect(()=>{animationRef.current=requestAnimationFrame(render);return()=>{if(animationRef.current)cancelAnimationFrame(animationRef.current)}},[render]);
 return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{objectFit:"cover"}}/>;
};
export default AREngine;
