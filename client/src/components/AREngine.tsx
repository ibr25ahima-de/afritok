import React, { useCallback, useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "./EffectsPanel";
import { applyBeautyEffects } from "./beautyEffects";
import { smoothLandmarks, LM, getFaceGeometry, getPoints } from "./faceUtils";

interface AREngineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeEffect: AREffect | null;
  isRecording?: boolean;
}

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const DETECTION_INTERVAL_MS = 50;

// TikTok-style base beauty: it is active even when the user selects "Aucun".
// Selecting an effect adds its own adjustments on top of this natural base.
const DEFAULT_BEAUTY = {
  smoothSkin: 1,
  brightenSkin: 0.045,
  enlargeEyes: 0,
  slimFace: 0,
  whitenTeeth: 0,
  enlargeLips: 0,
  symmetry: 0,
};

function applyLiveSkinPolish(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  buffer: HTMLCanvasElement
) {
  const points = getPoints(landmarks, LM.faceOval, width, height);
  if (points.length < 3) return;

  const face = getFaceGeometry(landmarks, width, height);
  const padding = Math.max(8, Math.round(Math.min(face.width, face.height) * 0.045));
  const left = Math.max(0, Math.floor(face.left - padding));
  const top = Math.max(0, Math.floor(face.top - padding));
  const right = Math.min(width, Math.ceil(face.right + padding));
  const bottom = Math.min(height, Math.ceil(face.bottom + padding));
  const cropWidth = right - left;
  const cropHeight = bottom - top;
  if (cropWidth < 16 || cropHeight < 16) return;

  if (buffer.width !== cropWidth || buffer.height !== cropHeight) {
    buffer.width = cropWidth;
    buffer.height = cropHeight;
  }

  const bctx = buffer.getContext("2d");
  if (!bctx) return;
  bctx.clearRect(0, 0, cropWidth, cropHeight);
  bctx.save();
  bctx.filter = "blur(4.5px)";
  bctx.drawImage(ctx.canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  bctx.restore();

  ctx.save();
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.clip();

  // Strong enough to remove small spots/black points, but blended so eyes,
  // nose, lips and the natural shape remain sharp.
  ctx.globalAlpha = 0.68;
  ctx.drawImage(buffer, left, top);
  ctx.restore();
}

export const AREngine: React.FC<AREngineProps> = ({ videoRef, activeEffect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skinBufferRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const previousLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastDetectionRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const initializingRef = useRef(false);

  const detectFace = useCallback((video: HTMLVideoElement, timestamp: number) => {
    const landmarker = landmarkerRef.current;
    if (!landmarker) return previousLandmarksRef.current;
    if (timestamp - lastDetectionRef.current < DETECTION_INTERVAL_MS) return previousLandmarksRef.current;
    if (video.currentTime === lastVideoTimeRef.current) return previousLandmarksRef.current;

    lastDetectionRef.current = timestamp;
    lastVideoTimeRef.current = video.currentTime;

    try {
      const result = landmarker.detectForVideo(video, timestamp);
      const current = result.faceLandmarks?.[0];
      if (!current) return previousLandmarksRef.current;

      // Fast smoothing so the beauty mask follows the face immediately.
      const stable = smoothLandmarks(current, previousLandmarksRef.current, 0.42);
      previousLandmarksRef.current = stable;
      return stable;
    } catch (error) {
      console.error("[AREngine] Face detection error:", error);
      return previousLandmarksRef.current;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.35,
          minFacePresenceConfidence: 0.35,
          minTrackingConfidence: 0.45,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        console.log("[AREngine] Real-time beauty engine ready");
      } catch (error) {
        console.error("[AREngine] MediaPipe initialization failed:", error);
      } finally {
        initializingRef.current = false;
      }
    };
    initialize();

    return () => {
      cancelled = true;
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      previousLandmarksRef.current = null;
      skinBufferRef.current = null;
    };
  }, []);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // The AREngine canvas is the actual visible camera surface.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.drawImage(video, 0, 0, width, height);

    const landmarks = detectFace(video, performance.now());
    if (landmarks?.length) {
      try {
        if (!skinBufferRef.current) skinBufferRef.current = document.createElement("canvas");

        // Base beauty is always applied, including when no effect is selected.
        applyLiveSkinPolish(ctx, landmarks, width, height, skinBufferRef.current);

        // Selected effect is layered after the base beauty so it is visibly different.
        const beautyConfig = {
          ...DEFAULT_BEAUTY,
          ...(activeEffect?.beautyConfig ?? {}),
        };
        applyBeautyEffects(ctx, landmarks, width, height, beautyConfig);
      } catch (error) {
        console.error("[AREngine] Beauty rendering error:", error);
      }
    }

    animationRef.current = requestAnimationFrame(renderFrame);
  }, [videoRef, activeEffect, detectFace]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      style={{ objectFit: "cover" }}
    />
  );
};

export default AREngine;
