import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Music, Pause, Play, RefreshCw, Sparkles, X, Sun, Timer as TimerIcon, LayoutGrid, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import AREngineMobile from "./AREngineMobile";
import EffectsPanel, { AR_EFFECTS, type AREffect } from "./EffectsPanel";
import { FILTERS, type Filter } from "./FilterLibrary";

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
  const [flashOn, setFlashOn] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0);
  const [aspect, setAspect] = useState<"full" | "square" | "portrait">("full");
  const [moreOpen, setMoreOpen] = useState(false);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<AREffect | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<Filter | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const handleArStatus = useCallback((s: string, e?: unknown) => {
    console.log("[AR STATUS]", s, e);
    setArStatus(e ? `${s}: ${String((e as Error)?.message || e)}` : s);
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
      await startCamera(nextMode);
      setFacingMode(nextMode);
      setFlashOn(false);
    } finally {
      setSwitchingCamera(false);
    }
  }, [facingMode, startCamera, switchingCamera]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as any;
    if (!track || !capabilities?.torch) {
      toast.info("Le flash n'est pas disponible sur cette caméra");
      return;
    }
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn }] } as any);
      setFlashOn((v) => !v);
    } catch {
      toast.error("Impossible d'activer le flash");
    }
  }, [flashOn]);

  const cycleAspect = () => setAspect((a) => (
    a === "full" ? "square" : a === "square" ? "portrait" : "full"
  ));

  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 397) {
      sum += data[i] + data[i + 1] + data[i + 2];
    }
    return sum < 40;
  };

  const takePhoto = () => {
    const arSource = arCanvasRef.current;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const w = arSource?.width || video?.videoWidth || 0;
    const h = arSource?.height || video?.videoHeight || 0;

    if (!w || !h) {
      toast.error("La caméra n'est pas encore prête");
      return;
    }

    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Impossible de préparer la photo");
      return;
    }

    if (arSource && arSource.width === w && arSource.height === h) {
      context.drawImage(arSource, 0, 0);
    }

    // Si le canvas AR est vide au moment exact de la capture,
    // utiliser directement la frame actuelle de la caméra.
    if (isCanvasBlank(canvas) && video && video.videoWidth) {
      context.clearRect(0, 0, w, h);
      context.save();
      context.translate(w, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, w, h);
      context.restore();
      console.warn("[takePhoto] canvas AR vide, repli sur la vidéo brute");
    }

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
      const arSource = arCanvasRef.current;
      canvas.width = arSource?.width || video.videoWidth || 720;
      canvas.height = arSource?.height || video.videoHeight || 1280;
      const context = canvas.getContext("2d");
      if (!context) {
        toast.error("Impossible de préparer l'enregistrement vidéo");
        return;
      }

      recordingCanvasRef.current = canvas;

      if (arSource && arSource.width === canvas.width && arSource.height === canvas.height) {
        context.drawImage(arSource, 0, 0);
      }

      const canvasStream = canvas.captureStream(30);
      recordingStreamRef.current = canvasStream;

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
    if (timerDuration > 0 && !recording) {
      for (let n = timerDuration; n > 0; n -= 1) {
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
    <div className="h-[100dvh] max-h-[100dvh] min-h-0 bg-black text-white relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <div
          className="relative overflow-hidden"
          style={
            aspect === "square"
              ? { aspectRatio: "1 / 1", maxHeight: "100%", width: "100%" }
              : aspect === "portrait"
                ? { aspectRatio: "4 / 5", maxHeight: "100%", width: "100%" }
                : { width: "100%", height: "100%" }
          }
        >
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
            filterCss={selectedFilter?.cssFilter}
            canvasRef={arCanvasRef}
            recordingCanvasRef={recordingCanvasRef}
            onStatusChange={handleArStatus}
          />
        </div>
      </div>

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

      <div className="relative z-30 flex items-center justify-between px-4 pt-3 pb-2">
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center" aria-label="Fermer"><X size={25} /></button>
        <button onClick={onOpenMusic} className="rounded-full bg-black/55 px-4 py-2 text-xs max-w-[55%] truncate" disabled={recording && switchingCamera}>
          <Music size={15} className="inline mr-2" />{selectedMusic?.name || "Ajouter un son"}
        </button>

      </div>

      <div className="absolute right-3 top-20 z-30 flex flex-col items-center gap-3">
        <button onClick={switchCamera} disabled={switchingCamera} className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center disabled:opacity-50" aria-label="Retourner la caméra">
          <RefreshCw size={20} className={switchingCamera ? "animate-spin" : ""} />
        </button>
        <button onClick={toggleFlash} className={`h-10 w-10 rounded-full flex items-center justify-center ${flashOn ? "bg-yellow-400 text-black" : "bg-black/45"}`} aria-label="Flash">
          <Sun size={20} />
        </button>
        <button onClick={() => setTimerDuration((d) => (d === 0 ? 3 : d === 3 ? 10 : 0))} className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center text-[10px] font-bold" aria-label="Minuteur">
          {timerDuration === 0 ? <TimerIcon size={20} /> : `${timerDuration}s`}
        </button>
        {moreOpen && (
          <button onClick={cycleAspect} className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center" aria-label="Disposition">
            <LayoutGrid size={20} />
          </button>
        )}
        <button onClick={() => setEffectsOpen(true)} className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center" aria-label="Retouche">
          <Sparkles size={20} className={selectedEffect ? "text-yellow-300" : ""} />
        </button>
        <button onClick={() => setFiltersOpen(true)} className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center" aria-label="Filtres">
          <span className={selectedFilter ? "text-yellow-300" : ""}>🎨</span>
        </button>
        <button onClick={() => setMoreOpen((v) => !v)} className="h-10 w-10 rounded-full bg-black/45 flex items-center justify-center" aria-label="Plus d'options">
          <ChevronUp size={20} className={`transition-transform ${moreOpen ? "" : "rotate-180"}`} />
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

      <div className="relative z-20 mt-auto bg-gradient-to-t from-black/95 via-black/55 to-transparent px-5 pb-4 pt-8">
        <div className="flex justify-center gap-3 mb-5">
          {["PHOTO", "10 s", "15 s", "60 s", "10 min"].map((mode) => (
            <button key={mode} onClick={() => !recording && setDurationMode(mode)} disabled={recording} className={`rounded-full px-3 py-2 text-xs font-bold transition ${durationMode === mode ? "bg-white text-black" : "bg-black/55 text-white"} ${recording ? "opacity-50" : ""}`}>
              {mode === "PHOTO" ? "Photo" : mode}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-7">
          <div className="w-16 flex justify-center">
            {recording && <button onClick={pauseRecording} disabled={paused} className="h-11 w-11 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-40" aria-label="Mettre en pause"><Pause size={20} /></button>}
          </div>

          <button onClick={capture} disabled={timer > 0} aria-label={!recording ? "Enregistrer" : paused ? "Continuer" : "Mettre en pause"} className="relative h-20 w-20 rounded-full border-4 border-white p-1.5 disabled:opacity-70">
            <span className="absolute inset-0 rounded-full bg-red-500" />
            {recording && !paused ? <span className="absolute inset-0 m-auto h-7 w-7 rounded-md bg-white" /> : recording && paused ? <Play className="absolute inset-0 m-auto" size={30} fill="white" /> : <span className="absolute inset-0 m-2 rounded-full bg-red-500" />}
          </button>

          <div className="w-16 flex justify-center">
            {recording ? <button onClick={stopRecording} className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg" aria-label="Terminer et monter la vidéo"><Check size={27} strokeWidth={3} /></button> : <button onClick={onOpenMusic} className="text-xs text-white/90">Audio</button>}
          </div>
        </div>

        {recording && <div className="mt-4 h-1.5 rounded-full bg-white/25 overflow-hidden"><div className="h-full bg-red-500 transition-[width] duration-100" style={{ width: `${progress * 100}%` }} /></div>}
        {recording && <p className="text-center text-[11px] text-white/65 mt-2">{paused ? "Vidéo en pause — appuie au centre pour continuer" : "Pause au centre • ✓ pour terminer et passer au montage"}</p>}
      </div>



      {filtersOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[70] bg-black/92 backdrop-blur-sm p-4 pb-8 max-h-[55vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white text-sm font-bold">Filtre de couleur</h3>
            <button onClick={() => setFiltersOpen(false)} className="text-white/80"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => { setSelectedFilter(null); setFiltersOpen(false); }}
              className="flex flex-col items-center gap-1"
            >
              <span className={`h-14 w-14 rounded-full border-2 ${!selectedFilter ? "border-white" : "border-white/25"} bg-white/10 flex items-center justify-center text-[10px] text-white`}>
                Normal
              </span>
            </button>
            {FILTERS.filter(f => f.category === "beauty" || f.category === "color").map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelectedFilter(f); setFiltersOpen(false); }}
                className="flex flex-col items-center gap-1"
              >
                <span className={`h-14 w-14 rounded-full border-2 overflow-hidden block ${selectedFilter?.id === f.id ? "border-white" : "border-white/25"}`}>
                  <span className="block h-full w-full" style={{ filter: f.cssFilter, background: "linear-gradient(135deg,#c98a5b,#7a4a2b)" }} />
                </span>
                <span className="text-[9px] text-white/80 truncate w-14 text-center">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <EffectsPanel
        isOpen={effectsOpen}
        onClose={() => setEffectsOpen(false)}
        selectedEffect={selectedEffect}
        onSelectEffect={(effect) => { setSelectedEffect(effect); setEffectsOpen(false); }}
      />
    </div>
  );
};

export default CameraRecorder;