import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, ImagePlus, Pause, Play, RefreshCw, Video, Volume2 } from "lucide-react";
import { toast } from "sonner";
import heic2any from "heic2any";

type Layout = "pip-tr" | "pip-bl" | "split" | "video-background";
type Props = {
  onClose?: () => void;
  onVideoRecorded: (blob: Blob, duration: number) => void;
};

const LAYOUTS: { id: Layout; title: string; description: string }[] = [
  { id: "pip-tr", title: "En haut à droite", description: "Ta caméra avec la vidéo dans un cadre" },
  { id: "pip-bl", title: "En bas à gauche", description: "La vidéo dans le coin inférieur" },
  { id: "split", title: "Côte à côte", description: "Les deux images partagent l’écran" },
  { id: "video-background", title: "Fond vidéo", description: "La vidéo remplit le fond, ta caméra reste visible" },
];

export default function ReactionCameraRecorder({ onClose, onVideoRecorded }: Props) {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const sourceGainRef = useRef<GainNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startAtRef = useRef(0);
  const [layout, setLayout] = useState<Layout>("pip-tr");
  const [layoutChosen, setLayoutChosen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceKind, setSourceKind] = useState<"video" | "image">("video");
  const [sourceVisible, setSourceVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [recording, setRecording] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const explainingRef = useRef(false);
  const recordingRef = useRef(false);
  // True only while the user expects the original video to be playing.
  const sourcePlaybackRequestedRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [startMode, setStartMode] = useState<"me" | "original">("original");
  const [sourceBox, setSourceBox] = useState({ x: 420, y: 50, w: 271, h: 355 });
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; boxX: number; boxY: number; boxW: number; boxH: number } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDistance: number; boxX: number; boxY: number; boxW: number; boxH: number } | null>(null);

  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  // Replace only the video track: the microphone track and the active
  // canvas/MediaRecorder stay alive while the user switches cameras.
  const switchCamera = async () => {
    if (switchingCamera) return;
    const stream = cameraStreamRef.current;
    const oldTrack = stream?.getVideoTracks()[0];
    if (!stream || !oldTrack) {
      toast.error("La caméra n'est pas disponible.");
      return;
    }

    const previousMode = cameraFacingMode;
    const nextMode = previousMode === "user" ? "environment" : "user";
    setSwitchingCamera(true);
    oldTrack.stop();
    stream.removeTrack(oldTrack);

    const attachVideoTrack = async (mode: "user" | "environment") => {
      const replacement = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const track = replacement.getVideoTracks()[0];
      if (!track) {
        replacement.getTracks().forEach((item) => item.stop());
        throw new Error("Aucune piste vidéo reçue.");
      }
      stream.addTrack(track);
      replacement.getTracks().filter((item) => item !== track).forEach((item) => item.stop());
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        await cameraRef.current.play();
      }
    };

    try {
      await attachVideoTrack(nextMode);
      setCameraFacingMode(nextMode);
    } catch (error) {
      console.error("[ReactionCameraRecorder] switch camera", error);
      try {
        await attachVideoTrack(previousMode);
        toast.error("Impossible de changer de caméra. L'ancienne caméra a été rétablie.");
      } catch (restoreError) {
        console.error("[ReactionCameraRecorder] restore camera", restoreError);
        setCameraAvailable(false);
        toast.error("Impossible de réouvrir la caméra. Arrête puis relance Réagir.");
      }
    } finally {
      setSwitchingCamera(false);
    }
  };

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }).then((stream) => {
      if (!alive) { stream.getTracks().forEach((track) => track.stop()); return; }
      cameraStreamRef.current = stream;
      setCameraAvailable(true);
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        cameraRef.current.muted = true;
        void cameraRef.current.play().catch(() => {});
      }
    }).catch((error) => {
      console.error("[ReactionCameraRecorder] camera", error);
      toast.error("Impossible d’ouvrir la caméra et le microphone.");
    });
    return () => {
      alive = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch { /* fermeture */ }
      }
      stopTracks(cameraStreamRef.current);
      if (audioContextRef.current) void audioContextRef.current.close().catch(() => {});
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [stopTracks]);

  useEffect(() => {
    if (!sourceUrl) return;
    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => {
    const camera = cameraRef.current;
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!camera || !source || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 720;
    canvas.height = 1280;
    const drawCover = (video: HTMLVideoElement, x: number, y: number, w: number, h: number) => {
      if (!video.videoWidth || !video.videoHeight) return;
      const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
      const sw = w / scale;
      const sh = h / scale;
      const sx = (video.videoWidth - sw) / 2;
      const sy = (video.videoHeight - sh) / 2;
      ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
    };
    const drawPhoto = (x: number, y: number, w: number, h: number) => {
      const img = photoRef.current;
      if (!img?.naturalWidth || !img.naturalHeight) return;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = w / scale, sh = h / scale;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
    };
    const drawSource = (x: number, y: number, w: number, h: number) => {
      if (sourceKind === "image") drawPhoto(x, y, w, h);
      else drawCover(source, x, y, w, h);
    };
    const draw = () => {
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const sourceReady = sourceVisible && (sourceKind === "image" ? !!photoRef.current?.naturalWidth : source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && source.videoWidth > 0);
      const cameraReady = camera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && camera.videoWidth > 0;
      if (layout === "split") {
        if (sourceReady) drawSource(0, 0, 360, 1280);
        if (cameraReady) drawCover(camera, 360, 0, 360, 1280);
      } else if (layout === "video-background") {
        if (sourceReady) drawSource(0, 0, 720, 1280);
        else { ctx.fillStyle = "#161616"; ctx.fillRect(0, 0, 720, 1280); }
        if (cameraReady) {
          ctx.save();
          ctx.fillStyle = "#000";
          ctx.fillRect(24, 900, 250, 350);
          drawCover(camera, 30, 906, 238, 338);
          ctx.restore();
        }
      } else {
        if (cameraReady) drawCover(camera, 0, 0, 720, 1280);
        if (sourceReady) {
          const { x, y, w, h } = sourceBox;
          ctx.save();
          ctx.fillStyle = "#000";
          ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
          drawSource(x, y, w, h);
          if (!recording || layout === "pip-tr" || layout === "pip-bl") {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(x + w - 24, y + h - 24, 24, 24);
          }
          ctx.restore();
        }
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [layout, sourceUrl, ready, sourceBox, recording, sourceVisible, sourceKind]);

  useEffect(() => {
    const source = sourceRef.current;
    const camera = cameraRef.current;
    if (!source || !camera || !sourceUrl || !ready || !cameraAvailable || !cameraStreamRef.current || sourceKind === "image" || audioContextRef.current) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      const audio = new AudioContextClass();
      const mic = audio.createMediaStreamSource(cameraStreamRef.current!);
      const micGain = audio.createGain();
      const sourceNode = audio.createMediaElementSource(source);
      const sourceGain = audio.createGain();
      const destination = audio.createMediaStreamDestination();
      micGain.gain.value = 0;
      sourceGain.gain.value = 1;
      mic.connect(micGain).connect(destination);
      sourceNode.connect(sourceGain).connect(destination);
      sourceGain.connect(audio.destination);
      audioContextRef.current = audio;
      micGainRef.current = micGain;
      sourceGainRef.current = sourceGain;
      (source as HTMLVideoElement & { __reactionAudioStream?: MediaStream }).__reactionAudioStream = destination.stream;
    } catch (error) {
      console.error("[ReactionCameraRecorder] audio setup", error);
      toast.error("Impossible de préparer le son de la vidéo.");
    }
  }, [sourceUrl, ready, cameraAvailable, sourceKind]);

  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return;
    // En mode « Moi d’abord », ne pas confondre une pause volontaire
    // (explication) avec une pause imprévue du lecteur pendant la lecture.
    // La référence exprime l’intention de lecture et évite les courses entre
    // les événements pause/play et les mises à jour React.
    const recoverUnexpectedPause = () => {
      if (startMode !== "me" || !recordingRef.current || !sourcePlaybackRequestedRef.current || source.ended || !source.paused) return;
      void source.play().catch((error) => {
        console.warn("[ReactionCameraRecorder] reprise automatique impossible", error);
      });
    };
    source.addEventListener("pause", recoverUnexpectedPause);
    source.addEventListener("canplay", recoverUnexpectedPause);
    return () => {
      source.removeEventListener("pause", recoverUnexpectedPause);
      source.removeEventListener("canplay", recoverUnexpectedPause);
    };
  }, [sourceUrl, ready, startMode]);

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => setElapsed(Math.floor((performance.now() - startAtRef.current) / 1000)), 250);
    return () => window.clearInterval(interval);
  }, [recording]);

  const chooseVideo = async (file?: File) => {
    if (!file) return;

    // Certains téléphones fournissent les photos au format HEIC/HEIF,
    // que le lecteur d'image du navigateur ne sait pas toujours décoder.
    const isHeic = /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|3gp|mkv)$/i.test(file.name);
    if (!isImage && !isVideo) {
      toast.error("Choisis une photo JPG, PNG, WebP ou HEIC, ou une vidéo compatible.");
      return;
    }

    let mediaBlob: Blob = file;
    if (isHeic) {
      try {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        mediaBlob = Array.isArray(converted) ? converted[0] : converted;
      } catch (error) {
        console.error("[ReactionCameraRecorder] conversion HEIC", error);
        toast.error("Cette photo HEIC/HEIF n’a pas pu être convertie. Essaie de la partager en JPG depuis ta galerie.");
        return;
      }
    }

    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const isSelectedImage = isImage;
    photoRef.current = null;
    setReady(false);
    setSourceKind(isSelectedImage ? "image" : "video");
    setSourceVisible(true);
    const url = URL.createObjectURL(mediaBlob);

    if (isSelectedImage) {
      const img = new Image();
      img.onload = () => {
        photoRef.current = img;
        setReady(true);
      };
      img.onerror = () => {
        photoRef.current = null;
        setReady(false);
        URL.revokeObjectURL(url);
        toast.error("Impossible de lire cette photo. Essaie un fichier JPG, PNG ou WebP.");
      };
      img.src = url;
    }

    setSourceUrl(url);
    setSourceName(file.name);
    setRecording(false);
    setExplaining(false);
    recordingRef.current = false;
    explainingRef.current = false;
    sourcePlaybackRequestedRef.current = false;
  };

  const start = async () => {
    const camera = cameraRef.current;
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!cameraStreamRef.current || !camera || !canvas || !source || !ready) {
      toast.error("Choisis une vidéo et attends que l’aperçu soit prêt.");
      return;
    }
    try {
      const audio = audioContextRef.current;
      if (audio?.state === "suspended") await audio.resume();
      const canvasStream = canvas.captureStream(30);
      if (sourceKind === "image") {
        // A still photo has no source audio: record the microphone directly.
        cameraStreamRef.current?.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      } else {
        const audioStream = (source as HTMLVideoElement & { __reactionAudioStream?: MediaStream }).__reactionAudioStream;
        if (!audioStream) {
          toast.error("Le son n’est pas prêt. Choisis à nouveau la vidéo.");
          return;
        }
        audioStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      }
      const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(canvasStream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_000_000, audioBitsPerSecond: 128_000 });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { recordingRef.current = false; toast.error("Une erreur est survenue pendant l’enregistrement."); setRecording(false); };
      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mime || "video/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const duration = Math.max(1, Math.round((performance.now() - startAtRef.current) / 1000));
        recordingRef.current = false;
        explainingRef.current = false;
        sourcePlaybackRequestedRef.current = false;
        setRecording(false);
        setExplaining(false);
        source.pause();
        if (blob.size < 1024) { toast.error("La vidéo enregistrée est vide. Réessaie."); return; }
        onVideoRecorded(blob, duration);
      };
      recorderRef.current = recorder;
      startAtRef.current = performance.now();
      if (sourceKind === "video") source.currentTime = 0;
      const beginWithMe = startMode === "me";
      sourcePlaybackRequestedRef.current = sourceKind === "video" && !beginWithMe && sourceVisible;
      if (audioContextRef.current && micGainRef.current && sourceGainRef.current) {
        micGainRef.current.gain.setTargetAtTime(beginWithMe || !sourceVisible || sourceKind === "image" ? 1 : 0, audioContextRef.current.currentTime, 0.02);
        sourceGainRef.current.gain.setTargetAtTime(beginWithMe || !sourceVisible || sourceKind === "image" ? 0 : 1, audioContextRef.current.currentTime, 0.02);
      }
      if (sourceKind === "image" || !sourceVisible) {
        explainingRef.current = true;
        source.pause();
      } else if (beginWithMe) {
        explainingRef.current = true;
        source.pause();
      } else {
        explainingRef.current = false;
        await source.play();
      }
      recorder.start(250);
      recordingRef.current = true;
      setRecording(true);
      setExplaining(sourceKind === "image" || beginWithMe || !sourceVisible);
    } catch (error) {
      console.error("[ReactionCameraRecorder] start", error);
      toast.error("Impossible de démarrer l’enregistrement. Réessaie.");
    }
  };

  const toggleExplain = () => {
    const source = sourceRef.current;
    const audio = audioContextRef.current;
    if (!recording || !source || !audio || sourceKind === "image") return;
    if (!explaining) {
      explainingRef.current = true;
      sourcePlaybackRequestedRef.current = false;
      source.pause();
      sourceGainRef.current?.gain.setTargetAtTime(0, audio.currentTime, 0.02);
      micGainRef.current?.gain.setTargetAtTime(1, audio.currentTime, 0.02);
      setExplaining(true);
    } else {
      explainingRef.current = false;
      sourcePlaybackRequestedRef.current = true;
      micGainRef.current?.gain.setTargetAtTime(0, audio.currentTime, 0.02);
      sourceGainRef.current?.gain.setTargetAtTime(1, audio.currentTime, 0.02);
      source.play().catch(() => toast.error("Impossible de reprendre la vidéo originale."));
      setExplaining(false);
    }
  };

  const toggleSourceVisibility = () => {
    const source = sourceRef.current;
    const audio = audioContextRef.current;
    if (!sourceUrl) return;
    if (sourceVisible) {
      sourcePlaybackRequestedRef.current = false;
      if (sourceKind === "video") source?.pause();
      if (recording && audio) {
        sourceGainRef.current?.gain.setTargetAtTime(0, audio.currentTime, 0.02);
        micGainRef.current?.gain.setTargetAtTime(1, audio.currentTime, 0.02);
        explainingRef.current = true;
        setExplaining(true);
      }
      setSourceVisible(false);
    } else {
      setSourceVisible(true);
      if (recording && audio && sourceKind === "video" && source) {
        sourcePlaybackRequestedRef.current = true;
        sourceGainRef.current?.gain.setTargetAtTime(1, audio.currentTime, 0.02);
        micGainRef.current?.gain.setTargetAtTime(0, audio.currentTime, 0.02);
        explainingRef.current = false;
        setExplaining(false);
        void source.play().catch(() => toast.error("Impossible de reprendre la vidéo."));
      }
    }
  };

  const finish = () => {
    if (!recording || finishing) return;
    setFinishing(true);
    recordingRef.current = false;
    explainingRef.current = true;
    sourcePlaybackRequestedRef.current = false;
    sourceRef.current?.pause();
    try { if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop(); }
    catch { setFinishing(false); toast.error("Impossible de terminer l’enregistrement."); }
  };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <video ref={cameraRef} autoPlay muted playsInline className="pointer-events-none absolute h-px w-px opacity-0" />
      {!layoutChosen ? (
        <div className="flex-1 overflow-y-auto p-4 pt-8">
          <button onClick={onClose} className="mb-5 flex items-center gap-2 text-sm text-white/80"><ArrowLeft size={18} /> Retour à la caméra</button>
          <h1 className="text-2xl font-bold">Réagir à une vidéo ou une photo</h1>
          <p className="mt-2 text-sm text-white/65">Choisis une vidéo ou une photo de ta galerie, puis filme ta réaction. Tu peux afficher ou masquer le média pendant l’enregistrement.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {LAYOUTS.map((item) => (
              <button key={item.id} onClick={() => { setLayout(item.id); setSourceBox(item.id === "pip-bl" ? { x: 24, y: 860, w: 271, h: 355 } : { x: 420, y: 50, w: 271, h: 355 }); setLayoutChosen(true); }} className={`rounded-2xl border p-3 text-left transition ${layout === item.id ? "border-red-400 bg-red-500/15" : "border-white/15 bg-white/5"}`}>
                <div className="mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-neutral-900 p-2">
                  <div className="relative h-full w-full overflow-hidden rounded bg-gradient-to-br from-neutral-700 to-neutral-950">
                    {item.id === "split" ? <div className="absolute inset-y-0 left-0 w-1/2 bg-neutral-500" /> : item.id === "video-background" ? <div className="absolute inset-0 bg-neutral-600" /> : <div className="absolute inset-0 bg-neutral-700" />}
                    <div className={`absolute rounded border-2 border-white ${item.id === "split" ? "right-0 top-0 h-full w-1/2" : item.id === "video-background" ? "bottom-1 left-1 h-1/3 w-1/3" : item.id === "pip-tr" ? "right-1 top-1 h-1/3 w-1/3" : "bottom-1 left-1 h-1/3 w-1/3"} bg-red-500/70`} />
                  </div>
                </div>
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="mt-1 text-xs text-white/55">{item.description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-20 flex items-center justify-between px-4 py-3">
            <button onClick={() => { if (!recording) { setLayoutChosen(false); setSourceUrl(""); setReady(false); } }} disabled={recording} className="flex items-center gap-2 text-sm disabled:opacity-40"><ArrowLeft size={20} /> Modèles</button>
            <span className="max-w-[55%] truncate text-xs text-white/70">{sourceName || "Choisir un média"}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={switchCamera} disabled={switchingCamera || !cameraAvailable} className="flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold disabled:opacity-50" aria-label="Retourner la caméra" title={cameraFacingMode === "user" ? "Passer à la caméra arrière" : "Passer à la caméra avant"}>
                <RefreshCw size={15} className={switchingCamera ? "animate-spin" : ""} />
                {switchingCamera ? "Changement…" : cameraFacingMode === "user" ? "Arrière" : "Avant"}
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-black">
                <ImagePlus size={16} /> Galerie
                <input type="file" accept="video/*,image/*" className="hidden" onChange={(event) => { chooseVideo(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 bg-black p-3">
            <canvas
            ref={canvasRef}
            className="mx-auto h-full max-h-full w-auto max-w-full touch-none rounded-xl object-contain"
            style={{ aspectRatio: "9 / 16" }}
            onPointerDown={(event) => {
              if (layout !== "pip-tr" && layout !== "pip-bl") return;
              const rect = event.currentTarget.getBoundingClientRect();
              const px = (event.clientX - rect.left) * (720 / rect.width);
              const py = (event.clientY - rect.top) * (1280 / rect.height);
              const b = sourceBox;
              if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) return;

              event.currentTarget.setPointerCapture(event.pointerId);
              activePointersRef.current.set(event.pointerId, { x: px, y: py });

              // Deux doigts sur la vidéo : pincer pour réduire, écarter pour agrandir.
              if (activePointersRef.current.size >= 2) {
                const points = Array.from(activePointersRef.current.values());
                const dx = points[1].x - points[0].x;
                const dy = points[1].y - points[0].y;
                pinchRef.current = {
                  startDistance: Math.max(1, Math.hypot(dx, dy)),
                  boxX: b.x,
                  boxY: b.y,
                  boxW: b.w,
                  boxH: b.h,
                };
                dragRef.current = null;
                return;
              }

              dragRef.current = {
                mode: px > b.x + b.w - 44 && py > b.y + b.h - 44 ? "resize" : "move",
                startX: px,
                startY: py,
                boxX: b.x,
                boxY: b.y,
                boxW: b.w,
                boxH: b.h,
              };
            }}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const px = (event.clientX - rect.left) * (720 / rect.width);
              const py = (event.clientY - rect.top) * (1280 / rect.height);
              if (activePointersRef.current.has(event.pointerId)) {
                activePointersRef.current.set(event.pointerId, { x: px, y: py });
              }

              const pinch = pinchRef.current;
              if (pinch && activePointersRef.current.size >= 2) {
                const points = Array.from(activePointersRef.current.values());
                const dx = points[1].x - points[0].x;
                const dy = points[1].y - points[0].y;
                const distance = Math.max(1, Math.hypot(dx, dy));
                const scale = distance / pinch.startDistance;
                const w = Math.max(120, Math.min(696, pinch.boxW * scale));
                const h = Math.max(150, Math.min(1270, pinch.boxH * scale));
                const centerX = pinch.boxX + pinch.boxW / 2;
                const centerY = pinch.boxY + pinch.boxH / 2;
                setSourceBox({
                  x: Math.max(0, Math.min(720 - w, centerX - w / 2)),
                  y: Math.max(0, Math.min(1280 - h, centerY - h / 2)),
                  w,
                  h,
                });
                return;
              }

              const drag = dragRef.current;
              if (!drag) return;
              const dx = px - drag.startX;
              const dy = py - drag.startY;
              if (drag.mode === "move") {
                setSourceBox((b) => ({ ...b, x: Math.max(0, Math.min(720 - b.w, drag.boxX + dx)), y: Math.max(0, Math.min(1280 - b.h, drag.boxY + dy)) }));
              } else {
                const w = Math.max(120, Math.min(696, drag.boxW + dx));
                const h = Math.max(150, Math.min(1270, drag.boxH + dy));
                setSourceBox((b) => ({ ...b, w: Math.min(w, 720 - b.x), h: Math.min(h, 1280 - b.y) }));
              }
            }}
            onPointerUp={(event) => {
              activePointersRef.current.delete(event.pointerId);
              if (activePointersRef.current.size < 2) pinchRef.current = null;
              dragRef.current = null;
            }}
            onPointerCancel={(event) => {
              activePointersRef.current.delete(event.pointerId);
              if (activePointersRef.current.size < 2) pinchRef.current = null;
              dragRef.current = null;
            }}
          />
            <video ref={sourceRef} src={sourceUrl || undefined} playsInline webkit-playsinline="true" preload="auto" className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0" onLoadedMetadata={() => { if (sourceKind === "video") setReady(true); }} onCanPlay={() => { if (sourceKind === "video") setReady(true); }} onError={() => { if (sourceKind === "video") { setReady(false); toast.error("Cette vidéo ne peut pas être lue sur cet appareil."); } }} />
            {!sourceUrl && <div className="absolute inset-0 flex items-center justify-center text-center text-white/60"><div><Video size={42} className="mx-auto mb-3" /><p>Sélectionne une vidéo ou une photo de ta galerie</p></div></div>}
            {sourceUrl && !ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Préparation du média…</div>}
          </div>
          <div className="z-20 space-y-3 bg-neutral-950 px-4 pb-5 pt-3">
            {recording && <div className="text-center text-sm font-semibold tabular-nums">{Math.floor(elapsed / 60).toString().padStart(2, "0")}:{Math.floor(elapsed % 60).toString().padStart(2, "0")} · {explaining ? "Ton explication" : "Vidéo originale"}</div>}
            {!recording && ready && sourceKind === "video" && <div className="space-y-2">
              <p className="text-center text-xs font-semibold text-white/75">Qui commence ?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setStartMode("me")} className={startMode === "me" ? "rounded-xl border border-red-400 bg-red-500/20 px-3 py-3 text-sm font-semibold" : "rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-semibold"}>Moi d’abord</button>
                <button onClick={() => setStartMode("original")} className={startMode === "original" ? "rounded-xl border border-red-400 bg-red-500/20 px-3 py-3 text-sm font-semibold" : "rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-semibold"}>Vidéo originale</button>
              </div>
            </div>}
            {sourceUrl && <button type="button" onClick={toggleSourceVisibility} className="mx-auto flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold">{sourceVisible ? <EyeOff size={19} /> : <Eye size={19} />}{sourceVisible ? "Masquer le média" : "Afficher le média"}</button>}
            <div className="grid grid-cols-2 gap-2">
              {!recording ? <button onClick={start} disabled={!ready} className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-red-500 py-3 font-bold disabled:opacity-40"><Video size={18} /> Enregistrer la réaction</button> : <>
                <button onClick={toggleExplain} disabled={sourceKind === "image" || !sourceVisible} className="flex items-center justify-center gap-2 rounded-full bg-white py-3 font-bold text-black disabled:opacity-40">{explaining ? <Play size={18} /> : <Pause size={18} />}{explaining ? "Reprendre la vidéo" : "Expliquer ce passage"}</button>
                <button onClick={finish} className="flex items-center justify-center gap-2 rounded-full bg-red-500 py-3 font-bold"><Check size={18} /> Terminer</button>
              </>}
            </div>
            <p className="text-center text-xs text-white/55">{sourceKind === "image" ? "La photo reste affichée pendant que tu filmes. Utilise Afficher/Masquer pour la faire apparaître ou disparaître quand tu veux." : recording ? (explaining ? "La vidéo originale est arrêtée : seule ta voix est enregistrée." : "La vidéo avance et sa voix est entendue. Appuie sur Expliquer pour l’arrêter.") : "Pendant l’explication, la vidéo s’arrête et ta voix prend le relais."}</p>
            {(layout === "pip-tr" || layout === "pip-bl") && <p className="text-center text-[11px] text-white/45">Déplace la vidéo avec un doigt. Pince avec deux doigts pour la réduire ou écarte-les pour l’agrandir. Tu peux aussi tirer le coin rouge.</p>}
            <div className="flex items-center justify-center gap-2 text-[11px] text-white/40"><Volume2 size={13} /> Le son alterne entre la vidéo originale et ton microphone.</div>
          </div>
        </>
      )}
    </div>
  );
}
