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

type ARStatus = "loading" | "ready" | "face" | "no-face" | "error";
type DiagnosticStage = "package" | "wasm" | "model" | "detector" | "face" | "error";
type CoverTransform = { scale: number; dx: number; dy: number };
type ARError = { stage: DiagnosticStage; message: string; cause?: unknown };

function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }

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
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.max(width / vw, height / vh);
  const dw = vw * scale, dh = vh * scale;
  const dx = (width - dw) / 2, dy = (height - dh) / 2;
  ctx.drawImage(video, dx, dy, dw, dh);
  return { scale, dx, dy };
}

function mapLandmarks(landmarks: NormalizedLandmark[], video: HTMLVideoElement, width: number, height: number, transform: CoverTransform) {
  const { scale, dx, dy } = transform;
  return landmarks.map((p) => ({ ...p, x: (p.x * video.videoWidth * scale + dx) / width, y: (p.y * video.videoHeight * scale + dy) / height }));
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
  const lastDetectAt = useRef(0), lastVideoTime = useRef(-1), lastTimestamp = useRef(0), lastFaceSeenAt = useRef(0);
  const activeEffectRef = useRef<AREffect | null>(activeEffect);
  const statusRef = useRef<ARStatus>("loading");
  const diagnosticRef = useRef<{ package: boolean; wasm: boolean; model: boolean; detector: boolean; face: boolean; error: string | null }>({ package: false, wasm: false, model: false, detector: false, face: false, error: null });

  const setStatus = useCallback((status: ARStatus, error?: ARError) => {
    if (statusRef.current === status && status !== "error") return;
    statusRef.current = status;
    if (status === "face") diagnosticRef.current.face = true;
    if (status === "no-face") diagnosticRef.current.face = false;
    if (error) diagnosticRef.current.error = `[${error.stage}] ${error.message}`;
    onStatusChange?.(status, error);
  }, [onStatusChange]);

  useEffect(() => { activeEffectRef.current = activeEffect; }, [activeEffect]);
  const setCanvas = useCallback((node: HTMLCanvasElement | null) => { canvasRef.current = node; if (externalCanvasRef) externalCanvasRef.current = node; }, [externalCanvasRef]);

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
        diagnosticRef.current.face = true;
        setStatus("face");
      } else if (now - lastFaceSeenAt.current > LOST_FACE_TIMEOUT_MS) {
        previousLandmarks.current = null;
        mappedLandmarks.current = null;
        diagnosticRef.current.face = false;
        setStatus("no-face");
      }
    } catch (error) {
      console.error("[AREngineMobile] detectForVideo", error);
      diagnosticRef.current.error = `[face] ${errorMessage(error)}`;
      setStatus("error", { stage: "face", message: errorMessage(error), cause: error });
    }
    return previousLandmarks.current;
  }, [setStatus]);

  useEffect(() => {
    let disposed = false;
    diagnosticRef.current = { package: false, wasm: false, model: false, detector: false, face: false, error: null };
    setStatus("loading");
    (async () => {
      let stage: DiagnosticStage = "package";
      try {
        if (!FaceLandmarker || !FilesetResolver) throw new Error("@mediapipe/tasks-vision est absent du bundle");
        diagnosticRef.current.package = true;
        stage = "wasm";
        const vision = await FilesetResolver.forVisionTasks(WASM);
        diagnosticRef.current.wasm = true;
        stage = "model";
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL }, runningMode: "VIDEO", numFaces: 1,
          minFaceDetectionConfidence: 0.15, minFacePresenceConfidence: 0.15, minTrackingConfidence: 0.15,
          outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        });
        if (disposed) { landmarker.close(); return; }
        diagnosticRef.current.model = true;
        diagnosticRef.current.detector = true;
        detector.current = landmarker;
        setStatus("ready");
      } catch (error) {
        const diagnostic: ARError = { stage, message: errorMessage(error), cause: error };
        diagnosticRef.current.error = `[${stage}] ${diagnostic.message}`;
        console.error("[AREngineMobile] MediaPipe init", diagnostic);
        setStatus("error", diagnostic);
      }
    })();
    return () => {
      disposed = true; detector.current?.close(); detector.current = null; previousLandmarks.current = null; mappedLandmarks.current = null;
      lastDetectAt.current = 0; lastVideoTime.current = -1; lastTimestamp.current = 0; lastFaceSeenAt.current = 0;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [setStatus]);

  const render = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) { raf.current = requestAnimationFrame(render); return; }
    const size = outputSize(canvas);
    if (canvas.width !== size.width || canvas.height !== size.height) { canvas.width = size.width; canvas.height = size.height; }
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) { raf.current = requestAnimationFrame(render); return; }
    const width = canvas.width, height = canvas.height, now = performance.now(), effect = activeEffectRef.current;
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = grade(effect);
    const transform = drawCover(ctx, video, width, height); ctx.restore();

    const landmarks = detect(video, now);
    if (landmarks?.length) {
      mappedLandmarks.current = mapLandmarks(landmarks, video, width, height, transform);
      const current = mappedLandmarks.current;
      if (current && effect?.beautyConfig) { try { applyBeautyPipeline(ctx, current, width, height, effect.beautyConfig); } catch (error) { console.error("[AREngineMobile] beauty pipeline", error); } }
      if (current && effect) { try { renderFaceEffect(ctx, current, width, height, effect); } catch (error) { console.error("[AREngineMobile] selected AR effect", error); } }
    }

    // Diagnostic overlay: proves each MediaPipe layer independently on the real device.
    const d = diagnosticRef.current;
    const parts = [`MP ${d.package ? "✓" : "…"}`, `WASM ${d.wasm ? "✓" : "…"}`, `MODELE ${d.model ? "✓" : "…"}`, `DETECTEUR ${d.detector ? "✓" : "…"}`, `VISAGE ${d.face ? "✓" : "—"}`];
    ctx.save();
    ctx.font = "600 11px sans-serif";
    ctx.textBaseline = "middle";
    const text = parts.join("  •  ");
    const x = 10, y = 10, paddingX = 10, h = 25, w = Math.min(width - 20, ctx.measureText(text).width + paddingX * 2);
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    ctx.fillStyle = "white";
    ctx.fillText(text.slice(0, Math.max(0, Math.floor(text.length * (w / Math.max(1, ctx.measureText(text).width + paddingX * 2))))), x + paddingX, y + h / 2);
    if (d.error) {
      ctx.font = "500 10px sans-serif";
      const msg = d.error.length > 90 ? `${d.error.slice(0, 87)}…` : d.error;
      ctx.fillStyle = "rgba(120,0,0,0.78)";
      ctx.fillRect(10, 40, Math.min(width - 20, ctx.measureText(msg).width + 16), 22);
      ctx.fillStyle = "white";
      ctx.fillText(msg, 18, 51);
    }
    ctx.restore();
    raf.current = requestAnimationFrame(render);
  }, [videoRef, detect]);

  useEffect(() => { raf.current = requestAnimationFrame(render); return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }; }, [render]);
  return <canvas ref={setCanvas} className="absolute inset-0 w-full h-full pointer-events-none z-20" />;
};

export default AREngineMobile;
