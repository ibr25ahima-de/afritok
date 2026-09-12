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

  const startCamera = useCallback(async () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
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
      console.error("[CameraRecorder:minimal] camera", error);
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
    try { recorder.requestData(); } catch { /* browser may not support it */ }
    recorder.stop();
    setRecording(false);
  }, []);

  const startRecording = async () => {
    const stream = streamRef.current;
    if (!stream || stream.getVideoTracks().every((track) => track.readyState !== "live")) {
      toast.error("La caméra n'est pas disponible");
      return;
    }
    const mime = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    try {
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setRecording(false); toast.error("L'enregistrement a échoué"); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || "video/webm" });
        const duration = Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000));
        if (blob.size < 1024) { toast.error("La vidéo enregistrée est vide"); return; }
        onVideoRecorded?.(blob, duration);
      };
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      recorder.start(1000);
      setSeconds(0);
      setRecording(true);
    } catch (error) {
      console.error("[CameraRecorder:minimal] recorder", error);
      toast.error("Ce téléphone ne peut pas enregistrer cette vidéo");
    }
  };

  const capture = async () => {
    if (timer > 0 && !recording) {
      for (let n = timer; n > 0; n -= 1) { setTimer(n); await new Promise((resolve) => setTimeout(resolve, 1000)); }
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

  useEffect(() => () => { if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop(); }, []);

  const limit = LIMITS[durationMode] || 15;
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
