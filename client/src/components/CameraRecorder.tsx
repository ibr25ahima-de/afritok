import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Music, Pause, Play, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import AREngineMobile from "./AREngineMobile";
import EffectsPanel, { AR_EFFECTS, type AREffect } from "./EffectsPanel";

interface CameraRecorderProps {
  onVideoRecorded?: (blob: Blob, duration: number) => void;
  onPhotoTaken?: (blob: Blob) => void;
  onClose?: () => void;
  onOpenMusic?: () => void;
  onOpenEffects?: () => void;
  onPublish?: () => void;
  selectedMusic?: { name: string; url: string } | null;
}

const LIMITS: Record<string, number> = { "10 s": 10, "15 s": 15, "60 s": 60, "10 min": 600 };

type FacingMode = "user" | "environment";

export const CameraRecorder: React.FC<CameraRecorderProps> = ({
  onVideoRecorded,
  onPhotoTaken,
  onClose,
  onOpenMusic,
  onOpenEffects,
  onPublish,
  selectedMusic,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const drawFrameRef = useRef<number | null>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const activeRecordingStartedAtRef = useRef(0);
  const accumulatedRecordingMsRef = useRef(0);
  const limitTimeoutRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [durationMode, setDurationMode] = useState("15 s");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timer, setTimer] = useState(0);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<AREffect | null>(null);
  const [arStatus, setArStatus] = useState<string>("—");
  const selectedEffectRef = useRef<AREffect | null>(null);
  const arCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const clearLimitTimeout = useCallback(() => {
    if (limitTimeoutRef.current !== null) {
      window.clearTimeout(limitTimeoutRef.current);
      limitTimeoutRef.current = null;
    }
  }, []);

  const getRecordedMs = useCallback(() => {
    const activeMs = activeRecordingStartedAtRef.current > 0
      ? performance.now() - activeRecordingStartedAtRef.current
      : 0;
    return accumulatedRecordingMsRef.current + Math.max(0, activeMs);
  }, []);

  const startCamera = useCallback(async (mode: FacingMode) => {
    const oldStream = streamRef.current;
    streamRef.current = null;
    stopTracks(oldStream);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stopTracks(stream);
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
      }
    } catch (error) {
      console.error("[CameraRecorder] camera", error);
      toast.error("Impossible d'ouvrir la caméra");
    }
  }, [stopTracks]);

  useEffect(() => {
    mountedRef.current = true;
    void startCamera("user");

    return () => {
      mountedRef.current = false;
      clearLimitTimeout();
      if (drawFrameRef.current !== null) cancelAnimationFrame(drawFrameRef.current);
      stopTracks(streamRef.current);
      stopTracks(recordingStreamRef.current);
      if (recorderRef.current?.state !== "inactive") {
        try {
          recorderRef.current?.stop();
        } catch {
          // Le composant est en train d'être démonté.
        }
      }
    };
  }, [startCamera, stopTracks, clearLimitTimeout]);

  useEffect(() => {
    selectedEffectRef.current = selectedEffect;
  }, [selectedEffect]);

  const switchCamera = useCallback(async () => {
    if (switchingCamera) return;

    const nextMode: FacingMode = facingMode === "user" ? "environment" : "user";
    setSwitchingCamera(true);
    try {
      // Le MediaRecorder et le canvas restent actifs : changer de caméra ne crée
      // pas un deuxième enregistrement et ne supprime pas le premier segment.
      await startCamera(nextMode);
      setFacingMode(nextMode);
    } finally {
      setSwitchingCamera(false);
    }
  }, [facingMode, startCamera, switchingCamera]);

  const takePhoto = () => {
    const source = arCanvasRef.current;
    console.log("[takePhoto] source size", source?.width, source?.height, "durationMode", durationMode);
    if (!source || !source.width || !source.height) {
      toast.error("La caméra n'est pas encore prête");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");
    context?.drawImage(source, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onPhotoTaken?.(blob);
    }, "image/jpeg", 0.95);
  };

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    clearLimitTimeout();

    if (recorder.state === "recording") {
      accumulatedRecordingMsRef.current += Math.max(0, performance.now() - activeRecordingStartedAtRef.current);
    }
    activeRecordingStartedAtRef.current = 0;

    try {
      recorder.stop();
    } catch (error) {
      console.error("[CameraRecorder] stop", error);
    }
    setRecording(false);
    setPaused(false);
  }, [clearLimitTimeout]);

  const startRecording = async () => {
    const video = videoRef.current;
    const sourceStream = streamRef.current;

    if (!video || !sourceStream || !video.videoWidth || !video.videoHeight) {
      toast.error("La caméra n'est pas encore prête");
      return;
    }

    const sourceTrack = sourceStream.getVideoTracks()[0];
    if (!sourceTrack || sourceTrack.readyState !== "live") {
      toast.error("La caméra n'est pas disponible");
      return;
    }

    const mime = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const context = canvas.getContext("2d");
      if (!context) {
        toast.error("Impossible de préparer l'enregistrement vidéo");
        return;
      }

      recordingCanvasRef.current = canvas;
      const canvasStream = canvas.captureStream(30);
      recordingStreamRef.current = canvasStream;

      const draw = () => {
        const source = arCanvasRef.current;
        if (source && source.width && source.height) {
          context.drawImage(source, 0, 0, canvas.width, canvas.height);
        }
        drawFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      const recorder = mime
        ? new MediaRecorder(canvasStream, { mimeType: mime })
        : new MediaRecorder(canvasStream);

      chunksRef.current = [];
      recorderRef.current = recorder;
      accumulatedRecordingMsRef.current = 0;
      activeRecordingStartedAtRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };

      recorder.onerror = (event) => {
        const error = (event as Event & { error?: DOMException }).error;
        console.error("[CameraRecorder] recorder error", error);
        clearLimitTimeout();
        activeRecordingStartedAtRef.current = 0;
        setRecording(false);
        setPaused(false);
        toast.error(`ERREUR ENREGISTREMENT: ${error?.message || "aucun détail"}`, {
          duration: 12000,
        });
      };

      recorder.onstop = () => {
        clearLimitTimeout();

        if (drawFrameRef.current !== null) {
          cancelAnimationFrame(drawFrameRef.current);
          drawFrameRef.current = null;
        }

        const actualMime = recorder.mimeType || mime || "video/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const duration = Math.max(1, Math.min(
          LIMITS[durationMode] || 600,
          Math.round(accumulatedRecordingMsRef.current / 1000),
        ));

        stopTracks(recordingStreamRef.current);
        recordingStreamRef.current = null;
        recordingCanvasRef.current = null;
        recorderRef.current = null;
        activeRecordingStartedAtRef.current = 0;

        console.info("[CameraRecorder] FINAL RECORDED BLOB", {
          mime: actualMime,
          size: blob.size,
          duration,
          chunks: chunksRef.current.length,
          camera: facingMode,
        });

        if (blob.size < 1024) {
          toast.error("La vidéo enregistrée est vide. Réessaie.");
          return;
        }

        onVideoRecorded?.(blob, duration);
      };

      recorder.start(250);
      setSeconds(0);
      setPaused(false);
      setRecording(true);

      const limitMs = (LIMITS[durationMode] || 15) * 1000;
      clearLimitTimeout();
      limitTimeoutRef.current = window.setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state !== "inactive") {
          stopRecording();
        }
      }, limitMs);
    } catch (error) {
      console.error("[CameraRecorder] recorder", error);
      const err = error instanceof DOMException ? `${error.name}: ${error.message}` : String(error);
      toast.error(`ERREUR CRÉATION ENREGISTREUR: ${err}`, { duration: 12000 });

      clearLimitTimeout();
      activeRecordingStartedAtRef.current = 0;
      if (drawFrameRef.current !== null) cancelAnimationFrame(drawFrameRef.current);
      drawFrameRef.current = null;
      stopTracks(recordingStreamRef.current);
      recordingStreamRef.current = null;
      recordingCanvasRef.current = null;
    }
  };

  const pauseRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    accumulatedRecordingMsRef.current += Math.max(0, performance.now() - activeRecordingStartedAtRef.current);
    activeRecordingStartedAtRef.current = 0;
    recorder.pause();
    clearLimitTimeout();
    setPaused(true);
  };

  const resumeRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    const remainingMs = Math.max(0, (LIMITS[durationMode] || 15) * 1000 - accumulatedRecordingMsRef.current);
    if (remainingMs <= 0) {
      stopRecording();
      return;
    }

    recorder.resume();
    activeRecordingStartedAtRef.current = performance.now();
    clearLimitTimeout();
    limitTimeoutRef.current = window.setTimeout(() => {
      if (recorderRef.current === recorder && recorder.state !== "inactive") {
        stopRecording();
      }
    }, remainingMs);
    setPaused(false);
  };

  const capture = async () => {
    console.log("[capture] durationMode =", durationMode, "recording =", recording);
    if (timer > 0 && !recording) {
      for (let n = timer; n > 0; n -= 1) {
        setTimer(n);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setTimer(0);
    }

    if (durationMode === "PHOTO") return takePhoto();
    if (!recording) return startRecording();
    if (paused) return resumeRecording();
    return pauseRecording();
  };

  useEffect(() => {
    if (!recording) return;

    const interval = window.setInterval(() => {
      const limitMs = (LIMITS[durationMode] || 15) * 1000;
      const elapsed = getRecordedMs();
      setSeconds(Math.min(LIMITS[durationMode] || 15, Math.floor(elapsed / 1000)));

      if (!paused && elapsed >= limitMs) stopRecording();
    }, 100);

    return () => window.clearInterval(interval);
  }, [recording, paused, durationMode, getRecordedMs, stopRecording]);

  const formatTime = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

  const progress = durationMode === "PHOTO"
    ? 0
    : Math.min(1, seconds / (LIMITS[durationMode] || 15));

  const durationLabel = durationMode === "10 min" ? "10:00" : durationMode === "60 s" ? "01:00" : durationMode === "15 s" ? "00:15" : "00:10";

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <AREngineMobile
        videoRef={videoRef}
        activeEffect={selectedEffect}
        canvasRef={arCanvasRef}
        onStatusChange={(s, e) => {
          console.log("[AR STATUS]", s, e);
          setArStatus(e ? `${s}: ${String((e as Error)?.message || e)}` : s);
        }}
      />

      {timer > 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 text-8xl font-bold">
          {timer}
        </div>
      )}

      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 rounded bg-black/80 px-3 py-1 text-[10px] font-mono text-lime-300 text-center leading-tight">
        AR: {arStatus}<br/>
        mode: {durationMode} | rec: {recording ? "OUI" : "non"}<br/>
        arCanvas: {arCanvasRef.current?.width || 0}×{arCanvasRef.current?.height || 0}
      </div>

      <div className="relative z-30 flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center"
          aria-label="Fermer"
        >
          <X size={25} />
        </button>

        <button
          onClick={onOpenMusic}
          className="rounded-full bg-black/55 px-4 py-2 text-xs max-w-[55%] truncate"
          disabled={recording && switchingCamera}
        >
          <Music size={15} className="inline mr-2" />
          {selectedMusic?.name || "Ajouter un son"}
        </button>

        <button
          onClick={switchCamera}
          disabled={switchingCamera}
          className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center disabled:opacity-50"
          aria-label="Changer de caméra"
        >
          <RefreshCw size={24} className={switchingCamera ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="relative z-30 flex justify-end px-4">
        <button
          onClick={() => setEffectsOpen(true)}
          className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center"
          aria-label="Effets de visage"
        >
          <Sparkles size={22} className={selectedEffect ? "text-yellow-300" : ""} />
        </button>
      </div>

      {recording && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/75 px-4 py-1.5 font-bold tabular-nums">
          <span className="text-red-400">●</span>{" "}
          {formatTime(seconds)}{" "}
          <span className="text-white/60">/ {durationLabel}</span>
          {paused && <span className="ml-2 text-yellow-300">PAUSE</span>}
        </div>
      )}



      <div className="relative z-20 mt-auto bg-gradient-to-t from-black/95 via-black/55 to-transparent px-5 pb-7 pt-12">
        <div className="flex justify-center gap-3 mb-5">
          {["PHOTO", "10 s", "15 s", "60 s", "10 min"].map((mode) => (
            <button
              key={mode}
              onClick={() => !recording && setDurationMode(mode)}
              disabled={recording}
              className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                durationMode === mode ? "bg-white text-black" : "bg-black/55 text-white"
              } ${recording ? "opacity-50" : ""}`}
            >
              {mode === "PHOTO" ? "Photo" : mode}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-7">
          <div className="w-16 flex justify-center">
            {recording && (
              <button
                onClick={pauseRecording}
                disabled={paused}
                className="h-11 w-11 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-40"
                aria-label="Mettre en pause"
              >
                <Pause size={20} />
              </button>
            )}
          </div>

          <button
            onClick={capture}
            disabled={timer > 0}
            aria-label={!recording ? "Enregistrer" : paused ? "Continuer" : "Mettre en pause"}
            className="relative h-20 w-20 rounded-full border-4 border-white p-1.5 disabled:opacity-70"
          >
            <span className="absolute inset-0 rounded-full bg-red-500" />
            {recording && !paused ? (
              <span className="absolute inset-0 m-auto h-7 w-7 rounded-md bg-white" />
            ) : recording && paused ? (
              <Play className="absolute inset-0 m-auto" size={30} fill="white" />
            ) : (
              <span className="absolute inset-0 m-2 rounded-full bg-red-500" />
            )}
          </button>

          <div className="w-16 flex justify-center">
            {recording ? (
              <button
                onClick={stopRecording}
                className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
                aria-label="Terminer et monter la vidéo"
              >
                <Check size={27} strokeWidth={3} />
              </button>
            ) : (
              <button onClick={onOpenMusic} className="text-xs text-white/90">
                Audio
              </button>
            )}
          </div>
        </div>

        {recording && (
          <div className="mt-4 h-1.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-red-500 transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {recording && (
          <p className="text-center text-[11px] text-white/65 mt-2">
            {paused ? "Vidéo en pause — appuie au centre pour continuer" : "Pause au centre • ✓ pour terminer et passer au montage"}
          </p>
        )}
      </div>
      <EffectsPanel
        isOpen={effectsOpen}
        onClose={() => setEffectsOpen(false)}
        selectedEffect={selectedEffect}
        onSelectEffect={(effect) => {
          setSelectedEffect(effect);
          setEffectsOpen(false);
        }}
      />

    </div>
  );
};

export default CameraRecorder;