import React, { useCallback, useEffect, useRef, useState } from "react";
import { Music, RefreshCw, Timer, X } from "lucide-react";
import { toast } from "sonner";

interface CameraRecorderProps {
  onVideoRecorded?: (blob: Blob, duration: number) => void;
  onPhotoTaken?: (blob: Blob) => void;
  onClose?: () => void;
  onOpenMusic?: () => void;
  onPublish?: () => void;
  selectedMusic?: { name: string; url: string } | null;
}

const LIMITS: Record<string, number> = { "15 s": 15, "60 s": 60, "10 min": 600 };

export const CameraRecorder: React.FC<CameraRecorderProps> = ({
  onVideoRecorded, onPhotoTaken, onClose, onOpenMusic, onPublish, selectedMusic,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [durationMode, setDurationMode] = useState("15 s");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timer, setTimer] = useState(0);

  const diagnoseRecordedBlob = useCallback((blob: Blob, actualMime: string) => {
    const url = URL.createObjectURL(blob);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.playsInline = true;

    const canPlay = probe.canPlayType(actualMime) || "";
    const timeout = window.setTimeout(() => {
      console.error("[CameraRecorder] DIAGNOSTIC timeout", {
        mime: actualMime,
        size: blob.size,
        canPlay,
      });
      toast.error(
        `DIAGNOSTIC vidéo: aucune réponse du lecteur. MIME=${actualMime} | taille=${blob.size} octets | canPlay=${canPlay || "non"}`,
        { duration: 12000 }
      );
      URL.revokeObjectURL(url);
    }, 8000);

    probe.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      console.info("[CameraRecorder] DIAGNOSTIC OK", {
        mime: actualMime,
        size: blob.size,
        canPlay,
        duration: probe.duration,
        width: probe.videoWidth,
        height: probe.videoHeight,
      });
      toast.success(
        `DIAGNOSTIC OK: vidéo lisible (${probe.videoWidth}x${probe.videoHeight}, ${Math.round(probe.duration * 10) / 10}s) | MIME=${actualMime} | ${blob.size} octets`,
        { duration: 9000 }
      );
      URL.revokeObjectURL(url);
    };

    probe.onerror = () => {
      window.clearTimeout(timeout);
      const mediaError = probe.error;
      const code = mediaError?.code ?? 0;
      const message = mediaError?.message || "aucun détail fourni par le lecteur";
      console.error("[CameraRecorder] DIAGNOSTIC PLAYBACK ERROR", {
        code,
        message,
        mime: actualMime,
        size: blob.size,
        canPlay,
        duration: probe.duration,
        width: probe.videoWidth,
        height: probe.videoHeight,
      });
      toast.error(
        `ERREUR RÉELLE VIDÉO: code=${code} | ${message} | MIME=${actualMime} | taille=${blob.size} | canPlay=${canPlay || "non"}`,
        { duration: 15000 }
      );
      URL.revokeObjectURL(url);
    };

    probe.src = url;
  }, []);

  const startCamera = useCallback(async () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
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
  }, [facingMode]);

  useEffect(() => {
    void startCamera();
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [startCamera]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      toast.error("La caméra n'est pas encore prête");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) onPhotoTaken?.(blob); }, "image/jpeg", 0.95);
  };

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setRecording(false);
  }, []);

  const startRecording = async () => {
    const stream = streamRef.current;
    if (!stream || stream.getVideoTracks().every((track) => track.readyState !== "live")) {
      toast.error("La caméra n'est pas disponible");
      return;
    }

    const mime = [
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    try {
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        console.info("[CameraRecorder] dataavailable", {
          size: event.data.size,
          type: event.data.type,
          chunkCount: chunksRef.current.length + 1,
        });
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = (event) => {
        const error = (event as Event & { error?: DOMException }).error;
        console.error("[CameraRecorder] recorder error", {
          name: error?.name,
          message: error?.message,
          mime: recorder.mimeType || mime,
          state: recorder.state,
          chunks: chunksRef.current.length,
        });
        setRecording(false);
        toast.error(
          `ERREUR ENREGISTREMENT: ${error?.name || "inconnue"} | ${error?.message || "aucun détail"} | chunks=${chunksRef.current.length}`,
          { duration: 15000 }
        );
      };
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mime || "video/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const duration = Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000));
        console.info("[CameraRecorder] FINAL RECORDED BLOB", {
          mime: actualMime,
          size: blob.size,
          duration,
          chunks: chunksRef.current.length,
          trackStates: stream.getTracks().map((track) => ({ kind: track.kind, state: track.readyState })),
          videoSettings: stream.getVideoTracks()[0]?.getSettings(),
        });
        if (blob.size < 1024) {
          toast.error("ERREUR ENREGISTREMENT: le Blob final est vide");
          return;
        }

        // Teste le Blob final lui-même avant de passer au montage.
        // Si ce test échoue, le problème vient de l'enregistrement/codec et non du montage.
        diagnoseRecordedBlob(blob, actualMime);
        onVideoRecorded?.(blob, duration);
      };
      recorder.start(1000);
      setSeconds(0);
      setRecording(true);
    } catch (error) {
      console.error("[CameraRecorder] recorder", error);
      const err = error instanceof DOMException ? `${error.name}: ${error.message}` : String(error);
      toast.error(`ERREUR CRÉATION ENREGISTREUR: ${err}`, { duration: 15000 });
    }
  };

  const capture = async () => {
    if (timer > 0 && !recording) {
      for (let n = timer; n > 0; n -= 1) {
        setTimer(n);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setTimer(0);
    }
    if (durationMode === "PHOTO") return takePhoto();
    if (recording) return stopRecording();
    return startRecording();
  };

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  useEffect(() => {
    if (recording && seconds >= LIMITS[durationMode]) stopRecording();
  }, [recording, seconds, durationMode, stopRecording]);

  useEffect(() => () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
  }, []);

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      {timer > 0 && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 text-8xl font-bold">{timer}</div>}
      {recording && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/75 px-4 py-1.5 font-bold tabular-nums"><span className="text-red-400">●</span> {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")} <span className="text-white/60">/ {durationMode === "10 min" ? "10:00" : durationMode === "60 s" ? "01:00" : "00:15"}</span></div>}
      <div className="relative z-20 flex justify-between p-4"><button onClick={onClose} aria-label="Fermer"><X size={28} /></button><button onClick={onOpenMusic} className="rounded-full bg-black/50 px-4 py-2 text-xs"><Music size={15} className="inline mr-2" />{selectedMusic?.name || "Ajouter un son"}</button><button onClick={() => setFacingMode((value) => value === "user" ? "environment" : "user")} aria-label="Retourner"><RefreshCw size={24} /></button></div>
      <div className="relative z-20 mt-auto bg-gradient-to-t from-black/90 to-transparent p-5 pb-8">
        <div className="flex justify-center gap-5 mb-5">{["PHOTO", "15 s", "60 s", "10 min"].map((mode) => <button key={mode} onClick={() => !recording && setDurationMode(mode)} className={`rounded-full px-4 py-2 text-sm font-bold ${durationMode === mode ? "bg-yellow-400 text-black" : "bg-black/50"}`}>{mode === "PHOTO" ? "Photo" : `Vidéo ${mode}`}</button>)}</div>
        <div className="flex items-center justify-center gap-8"><button onClick={onOpenMusic} className="text-xs">Audio</button><button onClick={capture} aria-label={recording ? "Arrêter" : "Enregistrer"} className={`h-20 w-20 rounded-full border-4 border-white p-2 ${recording ? "bg-red-500" : "bg-red-500"}`}><span className={recording ? "block h-7 w-7 mx-auto rounded-md bg-white" : "block h-full w-full rounded-full bg-red-500"} /></button><button onClick={onPublish} className="text-xs">Publier</button></div>
      </div>
    </div>
  );
};
export default CameraRecorder;