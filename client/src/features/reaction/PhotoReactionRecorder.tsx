import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, Check, ImagePlus, Video } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onClose?: () => void;
  onVideoRecorded: (blob: Blob, duration: number) => void;
};

export default function PhotoReactionRecorder({ onClose, onVideoRecorded }: Props) {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageUrlRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const [photoReady, setPhotoReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [photoVisible, setPhotoVisible] = useState(true);
  const photoVisibleRef = useRef(true);
  const photoRectRef = useRef({ x: 390, y: 760, w: 270, h: 360 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ mode: "drag" | "pinch"; startX: number; startY: number; x: number; y: number; w: number; h: number; distance: number } | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }).then((stream) => {
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        cameraRef.current.muted = true;
        void cameraRef.current.play().then(() => setCameraReady(true)).catch((error) => {
          console.error("[PhotoReactionRecorder] camera play", error);
          toast.error("Impossible de démarrer l’aperçu de la caméra.");
        });
      }
    }).catch((error) => {
      console.error("[PhotoReactionRecorder] camera", error);
      toast.error("Autorise l’accès à la caméra et au microphone pour réagir à la photo.");
    });
    return () => {
      active = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch { /* fermeture */ }
      }
      stopCamera();
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, [stopCamera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 720;
    canvas.height = 1280;
    const draw = () => {
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, 720, 1280);
      if (cameraReady && camera.videoWidth && camera.videoHeight) {
        const scale = Math.max(720 / camera.videoWidth, 1280 / camera.videoHeight);
        const sw = 720 / scale;
        const sh = 1280 / scale;
        ctx.save();
        ctx.translate(720, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(camera, (camera.videoWidth - sw) / 2, (camera.videoHeight - sh) / 2, sw, sh, 0, 0, 720, 1280);
        ctx.restore();
      }
      const image = imageRef.current;
      const rect = photoRectRef.current;
      if (photoVisibleRef.current && image?.naturalWidth && image.naturalHeight) {
        const scale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight);
        const sw = rect.w / scale;
        const sh = rect.h / scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.w, rect.h);
        ctx.clip();
        ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, rect.x, rect.y, rect.w, rect.h);
        ctx.restore();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [cameraReady, photoReady]);

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => setElapsed(Math.floor((performance.now() - startedAtRef.current) / 1000)), 250);
    return () => window.clearInterval(interval);
  }, [recording]);

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 720,
      y: ((event.clientY - bounds.top) / bounds.height) * 1280,
    };
  };

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photoReady || !photoVisible) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    pointersRef.current.set(event.pointerId, point);
    const rect = photoRectRef.current;
    const points = Array.from(pointersRef.current.values());
    if (points.length >= 2) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      gestureRef.current = { mode: "pinch", startX: point.x, startY: point.y, x: rect.x, y: rect.y, w: rect.w, h: rect.h, distance: Math.max(1, distance) };
    } else {
      gestureRef.current = { mode: "drag", startX: point.x, startY: point.y, x: rect.x, y: rect.y, w: rect.w, h: rect.h, distance: 0 };
    }
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId) || !gestureRef.current || !photoVisibleRef.current) return;
    event.preventDefault();
    const point = canvasPoint(event);
    pointersRef.current.set(event.pointerId, point);
    const gesture = gestureRef.current;
    const rect = photoRectRef.current;
    if (pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values());
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const ratio = distance / Math.max(1, gesture.distance);
      const w = Math.min(600, Math.max(100, gesture.w * ratio));
      const h = Math.min(800, Math.max(130, gesture.h * ratio));
      const centerX = gesture.x + gesture.w / 2;
      const centerY = gesture.y + gesture.h / 2;
      photoRectRef.current = {
        x: Math.min(720 - w, Math.max(0, centerX - w / 2)),
        y: Math.min(1280 - h, Math.max(0, centerY - h / 2)),
        w, h,
      };
    } else {
      photoRectRef.current = {
        ...rect,
        x: Math.min(720 - rect.w, Math.max(0, gesture.x + point.x - gesture.startX)),
        y: Math.min(1280 - rect.h, Math.max(0, gesture.y + point.y - gesture.startY)),
      };
    }
  };

  const handleCanvasPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
    const remaining = Array.from(pointersRef.current.values());
    if (remaining.length === 1) {
      const rect = photoRectRef.current;
      gestureRef.current = { mode: "drag", startX: remaining[0].x, startY: remaining[0].y, x: rect.x, y: rect.y, w: rect.w, h: rect.h, distance: 0 };
    }
  };

  const togglePhotoVisibility = () => {
    const next = !photoVisibleRef.current;
    photoVisibleRef.current = next;
    setPhotoVisible(next);
  };

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis un fichier photo JPG, PNG ou WebP.");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    const image = new Image();
    let triedDataUrlFallback = false;
    const acceptImage = (sourceUrl: string) => {
      if (imageUrlRef.current && imageUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
      imageUrlRef.current = sourceUrl.startsWith("blob:") ? sourceUrl : "";
      imageRef.current = image;
      photoRectRef.current = { x: 390, y: 760, w: 270, h: 360 };
      photoVisibleRef.current = true;
      setPhotoVisible(true);
      setPhotoReady(true);
    };
    image.onload = () => acceptImage(image.src);
    image.onerror = () => {
      // Some Android gallery providers expose a temporary file URI that the
      // browser cannot decode directly. Retry from the actual file bytes.
      if (!triedDataUrlFallback) {
        triedDataUrlFallback = true;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            image.onload = () => acceptImage(image.src);
            image.onerror = () => {
              URL.revokeObjectURL(nextUrl);
              toast.error("Cette image n’est pas dans un format lisible. Essaie une photo JPG ou PNG enregistrée sur le téléphone.");
            };
            image.src = reader.result;
          } else {
            URL.revokeObjectURL(nextUrl);
            toast.error("Impossible de lire cette photo. Essaie une photo JPG ou PNG.");
          }
        };
        reader.onerror = () => {
          URL.revokeObjectURL(nextUrl);
          toast.error("Impossible de lire cette photo depuis la galerie. Réessaie avec une autre photo.");
        };
        reader.readAsDataURL(file);
        return;
      }
      URL.revokeObjectURL(nextUrl);
      toast.error("Cette image n’est pas dans un format lisible. Essaie une photo JPG ou PNG enregistrée sur le téléphone.");
    };
    image.src = nextUrl;
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    const stream = streamRef.current;
    if (!canvas || !stream || !cameraReady || !photoReady) {
      toast.error("Choisis une photo et attends que la caméra soit prête.");
      return;
    }
    if (typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
      toast.error("L’enregistrement n’est pas pris en charge par ce navigateur.");
      return;
    }
    try {
      const output = canvas.captureStream(30);
      stream.getAudioTracks().forEach((track) => output.addTrack(track));
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(output, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = (event) => {
        console.error("[PhotoReactionRecorder] recorder", event);
        setRecording(false);
        toast.error("L’enregistrement de la réaction a échoué.");
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "video/webm" });
        const duration = Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000));
        setRecording(false);
        output.getTracks().forEach((track) => track.stop());
        if (blob.size < 1024) {
          toast.error("La réaction enregistrée est vide. Réessaie.");
          return;
        }
        onVideoRecorded(blob, duration);
      };
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      setElapsed(0);
      recorder.start(250);
      setRecording(true);
    } catch (error) {
      console.error("[PhotoReactionRecorder] start", error);
      toast.error("Impossible de démarrer l’enregistrement. Réessaie.");
    }
  };

  const finishRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try { recorder.stop(); } catch (error) {
      console.error("[PhotoReactionRecorder] stop", error);
      toast.error("Impossible de terminer l’enregistrement.");
    }
  };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <video ref={cameraRef} autoPlay muted playsInline className="pointer-events-none absolute h-px w-px opacity-0" />
      <div className="z-10 flex items-center justify-between px-4 py-3">
        <button onClick={onClose} disabled={recording} className="flex items-center gap-2 text-sm disabled:opacity-40">
          <ArrowLeft size={20} /> Retour
        </button>
        <span className="text-sm font-semibold">Réagir avec une photo</span>
        <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-black">
          <ImagePlus size={16} /> Galerie
          <input type="file" accept="image/jpeg,image/png,image/webp,image/*" disabled={recording} className="hidden" onChange={(event) => { void choosePhoto(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
        </label>
      </div>
      <div className="relative min-h-0 flex-1 p-3">
        <canvas ref={canvasRef} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={handleCanvasPointerUp} className="mx-auto h-full max-h-full w-auto max-w-full rounded-xl object-contain touch-none" style={{ aspectRatio: "9 / 16", touchAction: "none" }} />
        {!photoReady && <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-white/70"><p>Choisis une photo dans la galerie pour commencer.</p></div>}
        {photoReady && !cameraReady && <div className="absolute inset-x-4 bottom-4 rounded-lg bg-black/70 p-3 text-center text-sm">Préparation de la caméra…</div>}
      </div>
      <div className="z-10 space-y-3 bg-neutral-950 px-4 pb-5 pt-3">
        {recording && <p className="text-center text-sm font-semibold tabular-nums">{Math.floor(elapsed / 60).toString().padStart(2, "0")}:{Math.floor(elapsed % 60).toString().padStart(2, "0")}</p>}
        <div className="flex justify-center"><button type="button" onClick={togglePhotoVisibility} disabled={!photoReady} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold disabled:opacity-40">{photoVisible ? "Masquer la photo" : "Afficher la photo"}</button></div>
        <p className="text-center text-xs text-white/60">Déplace la photo avec un doigt. Pince avec deux doigts pour l’agrandir ou la réduire. Le bouton ci-dessus masque ou réaffiche la photo pendant l’enregistrement.</p>
        {!recording
          ? <button onClick={startRecording} disabled={!photoReady || !cameraReady} className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500 py-3 font-bold disabled:opacity-40"><Video size={18} /> Enregistrer ma réaction</button>
          : <button onClick={finishRecording} className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500 py-3 font-bold"><Check size={18} /> Terminer</button>}
      </div>
    </div>
  );
}
