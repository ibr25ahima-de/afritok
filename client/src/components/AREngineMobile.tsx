import React, { useCallback, useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "./EffectsPanel";
import { smoothLandmarks } from "./faceUtils";
import { applyBeautyPipeline } from "@/features/beauty/BeautyPipeline";
import { renderFaceEffect } from "@/features/beauty/FaceEffects";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function grade(e: AREffect | null) {
  const c = e?.beautyConfig ?? {};
  const brighten = Math.max(0, Math.min(1, c.brightenSkin ?? 0));
  const smooth = Math.max(0, Math.min(1, Math.max(c.smoothSkin ?? 0, c.skinTexture ?? 0)));
  return `brightness(${(1 + brighten * .055).toFixed(3)}) contrast(${(1 - smooth * .018).toFixed(3)}) saturate(${(1 + brighten * .045).toFixed(3)})`;
}

function outputSize(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const aspect = rect.width > 10 && rect.height > 10 ? rect.width / rect.height : 9 / 16;
  const maxDimension = 1280;
  if (aspect < 1) return { width: Math.max(360, Math.round(maxDimension * aspect)), height: maxDimension };
  return { width: maxDimension, height: Math.max(360, Math.round(maxDimension / aspect)) };
}

function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.max(width / vw, height / vh);
  const dw = vw * scale, dh = vh * scale;
  const dx = (width - dw) / 2, dy = (height - dh) / 2;
  ctx.drawImage(video, dx, dy, dw, dh);
  return { scale, dx, dy };
}

function mapLandmarks(landmarks: NormalizedLandmark[], video: HTMLVideoElement, width: number, height: number, transform: { scale: number; dx: number; dy: number }) {
  const { scale, dx, dy } = transform;
  return landmarks.map(p => ({ ...p, x: (p.x * video.videoWidth * scale - dx) / width, y: (p.y * video.videoHeight * scale - dy) / height }));
}

export const AREngineMobile: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeEffect: AREffect | null;
  isRecording?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}> = ({ videoRef, activeEffect, canvasRef: externalCanvasRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detector = useRef<FaceLandmarker | null>(null);
  const last = useRef(-1);
  const prev = useRef<NormalizedLandmark[] | null>(null);
  const mapped = useRef<NormalizedLandmark[] | null>(null);
  const raf = useRef<number | null>(null);
  const lastDetect = useRef(0);

  const setCanvas = useCallback((node: HTMLCanvasElement | null) => { canvasRef.current = node; if (externalCanvasRef) externalCanvasRef.current = node; }, [externalCanvasRef]);

  const detect = useCallback((v: HTMLVideoElement, t: number) => {
    if (!detector.current || t - lastDetect.current < 50 || v.currentTime === last.current) return prev.current;
    lastDetect.current = t; last.current = v.currentTime;
    try { const result = detector.current.detectForVideo(v, t); const face = result.faceLandmarks?.[0]; if (face) prev.current = smoothLandmarks(face, prev.current, .52); }
    catch (error) { console.error("[AREngineMobile] detect", error); }
    return prev.current;
  }, []);

  useEffect(() => {
    let disposed = false;
    (async () => { try {
      const vision = await FilesetResolver.forVisionTasks(WASM);
      const lm = await FaceLandmarker.createFromOptions(vision, { baseOptions:{modelAssetPath:MODEL}, runningMode:"VIDEO", numFaces:1, minFaceDetectionConfidence:.20, minFacePresenceConfidence:.20, minTrackingConfidence:.20, outputFaceBlendshapes:false, outputFacialTransformationMatrixes:false });
      if (disposed) lm.close(); else detector.current = lm;
    } catch (error) { console.error("[AREngineMobile] init", error); } })();
    return () => { disposed=true; detector.current?.close(); detector.current=null; prev.current=null; mapped.current=null; if(raf.current)cancelAnimationFrame(raf.current); };
  }, []);

  const render = useCallback(() => {
    const video=videoRef.current, canvas=canvasRef.current;
    if(!video||!canvas||video.readyState<2||!video.videoWidth){raf.current=requestAnimationFrame(render);return;}
    const size=outputSize(canvas);
    if(canvas.width!==size.width||canvas.height!==size.height){canvas.width=size.width;canvas.height=size.height;}
    const ctx=canvas.getContext("2d",{alpha:false}); if(!ctx)return;
    const w=canvas.width,h=canvas.height;
    ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.filter=grade(activeEffect);
    const transform=drawCover(ctx,video,w,h);ctx.filter="none";
    const landmarks=detect(video,performance.now());
    if(landmarks?.length){try{mapped.current=mapLandmarks(landmarks,video,w,h,transform);applyBeautyPipeline(ctx,mapped.current,w,h,activeEffect?.beautyConfig);renderFaceEffect(ctx,mapped.current,w,h,activeEffect);}catch(error){console.error("[AREngineMobile] face effect",error);}}
    raf.current=requestAnimationFrame(render);
  },[videoRef,activeEffect,detect]);

  useEffect(()=>{raf.current=requestAnimationFrame(render);return()=>{if(raf.current)cancelAnimationFrame(raf.current);};},[render]);
  return <canvas ref={setCanvas} className="absolute inset-0 w-full h-full pointer-events-none z-20"/>;
};
export default AREngineMobile;
