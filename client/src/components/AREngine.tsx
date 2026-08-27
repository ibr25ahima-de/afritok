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
const DETECTION_INTERVAL_MS = 80;

// Beauté de base, toujours active comme sur les caméras sociales modernes.
// Les effets sélectionnés peuvent renforcer ou compléter ces réglages.
const DEFAULT_BEAUTY = {
  smoothSkin: 0.72,
  brightenSkin: 0.10,
  enlargeEyes: 0,
  slimFace: 0,
  whitenTeeth: 0,
  enlargeLips: 0,
  symmetry: 0.05,
};

export const AREngine: React.FC<AREngineProps> = ({ videoRef, activeEffect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const previousLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastDetectionRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const initializingRef = useRef(false);

  const detectFace = useCallback((video: HTMLVideoElement, timestamp: number) => {
    const landmarker = landmarkerRef.current;
    if (!landmarker) return previousLandmarksRef.current;
    if (timestamp - lastDetectionRef.current < DETECTION_INTERVAL_MS) {
      return previousLandmarksRef.current;
    }
    if (video.currentTime === lastVideoTimeRef.current) {
      return previousLandmarksRef.current;
    }

    lastVideoTimeRef.current = video.currentTime;
    lastDetectionRef.current = timestamp;

    try {
      const result = landmarker.detectForVideo(video, timestamp);
      const current = result.faceLandmarks?.[0];
      if (!current) return previousLandmarksRef.current;

      const stable = smoothLandmarks(
        current,
        previousLandmarksRef.current,
        0.30
      );
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
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.65,
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
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      previousLandmarksRef.current = null;
    };
  }, []);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      animationRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Le canvas est le rendu visible : caméra + beauté + effets en temps réel.
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);

    const landmarks = detectFace(video, performance.now());
    if (landmarks && landmarks.length > 0) {
      try {
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
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
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
