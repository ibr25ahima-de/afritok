import React, { useCallback, useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "./EffectsPanel";
import { smoothLandmarks } from "./faceUtils";
import { applyBeautyPipeline } from "@/features/beauty/BeautyPipeline";
import { renderFaceEffect } from "@/features/beauty/FaceEffects";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const DETECTION_INTERVAL_MS = 40;
const LANDMARK_SMOOTHING = 0.72;
const LOST_FACE_TIMEOUT_MS = 350;

type ARStatus = "loading" | "package" | "wasm" | "model" | "ready" | "face" | "no-face" | "error";
type CoverTransform = { scale: number; dx: number; dy: number };
type ARError = { stage: ARStatus; message: string; cause?: unknown };

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function grade(e: AREffect | null) {
  const c = e?.beautyConfig ?? {};
  const brighten = Math.max(0, Math.min(1, c.brightenSkin ?? 0));
  const smooth = Math.max(0, Math.min(1, Math.max(c.smoothSkin ?? 0, c.skinTexture ?? 0)));
  return `brightness(${(1 + brighten * 0.055).toFixed(3)}) contrast(${(1 - smooth * 0.018).toFixed(3)}) saturate(${(1 + brighten * 0.045).toFixed(3)})`;
}

function outputSize(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const aspect = rect.width > 10 && rect.height > 10 ? rect.width / rect.height : 9 / 16;
  const maxDimension = 1280;
  if (aspect < 1) return { width: Math.max(360, Math.round(maxDimension * aspect)), height: maxDimension };
  return { width: maxDimension, height: Math.max(360, Math.round(maxDimension / aspect)) };
}

function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number): CoverTransform {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.max(width / vw, height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(video, dx, dy, dw, dh);
  return { scale, dx, dy };
}

function mapLandmarks(landmarks: NormalizedLandmark[], video: HTMLVideoElement, width: number, height: number, transform: CoverTransform) {
  const { scale, dx, dy } = transform;
  return landmarks.map((p) => ({
    ...p,
    x: (p.x * video.videoWidth * scale + dx) / width,
    y: (p.y * video.videoHeight * scale + dy) / height,
  }));
}

export const AREngineMobile: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeEffect: AREffect | null;
  isRecording?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  onStatusChange?: (status: ARStatus, error?: ARError) => void;
}> = ({ videoRef, activeEffect, canvasRef: externalCanvasRef, onStatusChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detector = useRef<FaceLandmarker | null>(null);
  const previousLandmarks = useRef<NormalizedLandmark[] | null>(null);
  const mappedLandmarks = useRef<NormalizedLandmark[] | null>(null);
  const raf = useRef<number | null>(null);
  const lastDetectAt = useRef(0);
  const lastVideoTime = useRef(-1);
  const lastTimestamp = useRef(0);
  const lastFaceSeenAt = useRef(0);
  const activeEffectRef = useRef<AREffect | null>(activeEffect);
  const statusRef = useRef<ARStatus>("loading");

  const setStatus = useCallback((status: ARStatus, error?: ARError) => {
    if (statusRef.current === status && status !== "error") return;
    statusRef.current = status;
    onStatusChange?.(status, error);
  }, [onStatusChange]);

  useEffect(() => { activeEffectRef.current = activeEffect; }, [activeEffect]);

  const setCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (externalCanvasRef) externalCanvasRef.current = node;
  }, [externalCanvasRef]);

  const detect = useCallback((video: HTMLVideoElement, now: number) => {
    const landmarker = detector.current;
    if (!landmarker) return previousLandmarks.current;
    if (video.currentTime <= 0 || video.currentTime === lastVideoTime.current) return previousLandmarks.current;
    if (now - lastDetectAt.current < DETECTION_INTERVAL_MS) return previousLandmarks.current;

    lastDetectAt.current = now;
    lastVideoTime.current = video.currentTime;
    const timestamp = Math.max(Math.round(now), lastTimestamp.current + 1);
    lastTimestamp.current = timestamp;

    try {
      const result = landmarker.detectForVideo(video, timestamp);
      const face = result.faceLandmarks?.[0];
      if (face && face.length > 400) {
        previousLandmarks.current = smoothLandmarks(face, previousLandmarks.current, LANDMARK_SMOOTHING);
        lastFaceSeenAt.current = now;
        setStatus("face");
      } else if (now - lastFaceSeenAt.current > LOST_FACE_TIMEOUT_MS) {
        previousLandmarks.current = null;
        mappedLandmarks.current = null;
        setStatus("no-face");
      }
    } catch (error) {
      console.error("[AREngineMobile] detectForVideo", error);
      setStatus("error", { stage: "error", message: errorMessage(error), cause: error });
    }
    return previousLandmarks.current;
  }, [setStatus]);

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    (async () => {
      let stage: ARStatus = "package";
      try {
        // If this module imported successfully, the @mediapipe/tasks-vision package is in the bundle.
        if (!FaceLandmarker || !FilesetResolver) throw new Error("@mediapipe/tasks-vision est absent du bundle");
        setStatus("package");

        stage = "wasm";
        setStatus("wasm");
        const vision = await FilesetResolver.forVisionTasks(WASM);

        stage = "model";
        setStatus("model");
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.15,
          minFacePresenceConfidence: 0.15,
          minTrackingConfidence: 0.15,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });

        if (disposed) { landmarker.close(); return; }
        detector.current = landmarker;
        setStatus("ready");
      } catch (error) {
        const diagnostic: ARError = { stage, message: errorMessage(error), cause: error };
        console.error("[AREngineMobile] MediaPipe init", diagnostic);
        setStatus("error", diagnostic);
      }
    })();

    return () => {
      disposed = true;
      detector.current?.close();
      detector.current = null;
      previousLandmarks.current = null;
      mappedLandmarks.current = null;
      lastDetectAt.current = 0;
      lastVideoTime.current = -1;
      lastTimestamp.current = 0;
      lastFaceSeenAt.current = 0;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [setStatus]);

  const render = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
      raf.current = requestAnimationFrame(render);
      return;
    }

    const size = outputSize(canvas);
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width;
      canvas.height = size.height;
    }
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) { raf.current = requestAnimationFrame(render); return; }

    const width = canvas.width;
    const height = canvas.height;
    const now = performance.now();
    const effect = activeEffectRef.current;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = grade(effect);
    const transform = drawCover(ctx, video, width, height);
    ctx.restore();

    const landmarks = detect(video, now);
    if (landmarks?.length) {
      mappedLandmarks.current = mapLandmarks(landmarks, video, width, height, transform);
      const current = mappedLandmarks.current;
      if (current && effect?.beautyConfig) {
        try { applyBeautyPipeline(ctx, current, width, height, effect.beautyConfig); }
        catch (error) { console.error("[AREngineMobile] beauty pipeline", error); }
      }
      if (current && effect) {
        try { renderFaceEffect(ctx, current, width, height, effect); }
        catch (error) { console.error("[AREngineMobile] selected AR effect", error); }
      }
    }
    raf.current = requestAnimationFrame(render);
  }, [videoRef, detect]);

  useEffect(() => {
    raf.current = requestAnimationFrame(render);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); };
  }, [render]);

  return <canvas ref={setCanvas} className="absolute inset-0 w-full h-full pointer-events-none z-20" />;
};

export default AREngineMobile;
