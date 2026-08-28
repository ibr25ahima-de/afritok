import React, { useCallback, useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "./EffectsPanel";
import { applyBeautyEffects } from "./beautyEffects";
import { smoothLandmarks, LM, getFaceGeometry, getPoints } from "./faceUtils";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const BASE = { smoothSkin: 0.72, brightenSkin: 0.06, enlargeEyes: 0, slimFace: 0, whitenTeeth: 0, enlargeLips: 0, symmetry: 0 };

function path(ctx: CanvasRenderingContext2D, p: {x:number;y:number}[]) { if (p.length < 3) return false; ctx.beginPath(); p.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y)); ctx.closePath(); return true; }
function baseBeauty(ctx: CanvasRenderingContext2D,w:number,h:number,landmarks?:NormalizedLandmark[]) {
  let cx=w/2,cy=h*.5,rx=w*.30,ry=h*.36;
  if(landmarks?.length){const p=getPoints(landmarks,LM.faceOval,w,h);if(p.length>=3){const f=getFaceGeometry(landmarks,w,h);cx=f.cx;cy=f.cy;rx=f.width*.55;ry=f.height*.55;}}
  const src=document.createElement("canvas");src.width=w;src.height=h;const s=src.getContext("2d");if(!s)return;s.drawImage(ctx.canvas,0,0);
  ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.clip();ctx.globalAlpha=.58;ctx.filter="blur(7px)";ctx.drawImage(src,0,0);ctx.filter="none";ctx.restore();
}
function grade(e:AREffect|null){const c=e?.beautyConfig??{};const b=c.brightenSkin??0;const s=Math.max(.12,c.smoothSkin??0);return `brightness(${(1+Math.min(.08,b*.12)).toFixed(3)}) contrast(${(1-Math.min(.03,s*.02)).toFixed(3)}) saturate(${(1+Math.min(.08,b*.08)).toFixed(3)})`;}

export const AREngineMobile:React.FC<{videoRef:React.RefObject<HTMLVideoElement|null>;activeEffect:AREffect|null;isRecording?:boolean}> = ({videoRef,activeEffect})=>{
 const canvasRef=useRef<HTMLCanvasElement|null>(null);const detector=useRef<FaceLandmarker|null>(null);const last=useRef(-1);const prev=useRef<NormalizedLandmark[]|null>(null);const raf=useRef<number|null>(null);const lastDetect=useRef(0);
 const detect=useCallback((v:HTMLVideoElement,t:number)=>{if(!detector.current||t-lastDetect.current<80||v.currentTime===last.current)return prev.current;lastDetect.current=t;last.current=v.currentTime;try{const r=detector.current.detectForVideo(v,t);const f=r.faceLandmarks?.[0];if(f)prev.current=smoothLandmarks(f,prev.current,.45);}catch(e){console.error("[AREngineMobile] detect",e);}return prev.current;},[]);
 useEffect(()=>{let dead=false;(async()=>{try{const vision=await FilesetResolver.forVisionTasks(WASM);const lm=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL},runningMode:"VIDEO",numFaces:1,minFaceDetectionConfidence:.20,minFacePresenceConfidence:.20,minTrackingConfidence:.20,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false});if(dead)lm.close();else detector.current=lm;}catch(e){console.error("[AREngineMobile] init",e);}})();return()=>{dead=true;detector.current?.close();detector.current=null;prev.current=null;if(raf.current)cancelAnimationFrame(raf.current);};},[]);
 const render=useCallback(()=>{const v=videoRef.current,c=canvasRef.current;if(!v||!c||v.readyState<2||!v.videoWidth){raf.current=requestAnimationFrame(render);return;}if(c.width!==v.videoWidth||c.height!==v.videoHeight){c.width=v.videoWidth;c.height=v.videoHeight;}const x=c.getContext("2d");if(!x)return;const w=c.width,h=c.height;x.globalAlpha=1;x.globalCompositeOperation="source-over";x.filter=grade(activeEffect);x.drawImage(v,0,0,w,h);x.filter="none";const lm=detect(v,performance.now());baseBeauty(x,w,h,lm??undefined);if(lm?.length)try{applyBeautyEffects(x,lm,w,h,{...BASE,...(activeEffect?.beautyConfig??{})});}catch(e){console.error("[AREngineMobile] effects",e);}raf.current=requestAnimationFrame(render);},[videoRef,activeEffect,detect]);
 useEffect(()=>{raf.current=requestAnimationFrame(render);return()=>{if(raf.current)cancelAnimationFrame(raf.current);};},[render]);
 return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{objectFit:"cover"}}/>;
};
export default AREngineMobile;
