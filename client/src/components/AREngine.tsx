import React, { useCallback, useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "./EffectsPanel";
import { applyBeautyEffects } from "./beautyEffects";
import { smoothLandmarks } from "./faceUtils";

interface AREngineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeEffect: AREffect | null;
  isRecording?: boolean;
}

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const DETECTION_INTERVAL_MS = 66;

// TikTok-style camera baseline: beauty remains active even when no preset is selected.
const DEFAULT_BEAUTY = {
  smoothSkin: 0.82,
  skinTexture: 0.86,
  brightenSkin: 0.06,
  darkCircles: 0.28,
  eyeBrilliance: 0.14,
  smileLines: 0.18,
  enlargeEyes: 0,
  slimFace: 0,
  whitenTeeth: 0,
  enlargeLips: 0,
  symmetry: 0,
};

function getCameraFilter(effect: AREffect | null) {
  if (!effect) return "none";
  const c = effect.beautyConfig ?? {};
  const s = Math.max(c.smoothSkin ?? 0, c.skinTexture ?? 0);
  const b = c.brightenSkin ?? 0;
  return `brightness(${(1 + Math.min(.07, b*.08+s*.01)).toFixed(3)}) contrast(${(1-Math.min(.025,s*.015)).toFixed(3)}) saturate(${(1+Math.min(.06,b*.06)).toFixed(3)})`;
}

export const AREngine: React.FC<AREngineProps> = ({ videoRef, activeEffect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const previousRef = useRef<NormalizedLandmark[] | null>(null);
  const lastDetect = useRef(0);
  const lastTime = useRef(-1);
  const initRef = useRef(false);

  const detect = useCallback((video: HTMLVideoElement, timestamp: number) => {
    const lm = landmarkerRef.current;
    if (!lm) return previousRef.current;
    if (timestamp - lastDetect.current < DETECTION_INTERVAL_MS || video.currentTime === lastTime.current) return previousRef.current;
    lastDetect.current = timestamp;
    lastTime.current = video.currentTime;
    try {
      const result = lm.detectForVideo(video, timestamp);
      const current = result.faceLandmarks?.[0];
      if (current) previousRef.current = smoothLandmarks(current, previousRef.current, .55);
    } catch (error) {
      console.error("[AREngine] face detection error", error);
    }
    return previousRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initRef.current) return;
      initRef.current = true;
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: .25,
          minFacePresenceConfidence: .25,
          minTrackingConfidence: .25,
        });
        if (cancelled) { lm.close(); return; }
        landmarkerRef.current = lm;
        console.log("[AREngine] Face Retouch engine ready");
      } catch (error) {
        console.error("[AREngine] init failed", error);
      } finally {
        initRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      previousRef.current = null;
    };
  }, []);

  const render = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
      animationRef.current = requestAnimationFrame(render);
      return;
    }
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.filter = getCameraFilter(activeEffect);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.filter = "none";

    const landmarks = detect(video, performance.now());
    if (landmarks?.length) {
      applyBeautyEffects(ctx, landmarks, width, height, {
        ...DEFAULT_BEAUTY,
        ...(activeEffect?.beautyConfig ?? {}),
      });
    }
    animationRef.current = requestAnimationFrame(render);
  }, [videoRef, activeEffect, detect]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [render]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{ objectFit: "cover" }} />;
};

export default AREngine;
