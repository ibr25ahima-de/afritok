import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ImagePlus, Pause, Play, Video, Volume2 } from "lucide-react";
import { toast } from "sonner";

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
  const [ready, setReady] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [recording, setRecording] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const explainingRef = useRef(false);
  const recordingRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [startMode, setStartMode] = useState<"me" | "original">("original");
  const [sourceBox, setSourceBox] = useState({ x: 420, y: 50, w: 271, h: 355 });
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; boxX: number; boxY: number; boxW: number; boxH: number } | null>(null);

  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

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
    const draw = () => {
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const sourceReady = source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && source.videoWidth > 0;
      const cameraReady = camera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && camera.videoWidth > 0;
      if (layout === "split") {
        if (sourceReady) drawCover(source, 0, 0, 360, 1280);
        if (cameraReady) drawCover(camera, 360, 0, 360, 1280);
      } else if (layout === "video-background") {
        if (sourceReady) drawCover(source, 0, 0, 720, 1280);
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
          drawCover(source, x, y, w, h);
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
  }, [layout, sourceUrl, ready, sourceBox, recording]);

  useEffect(() => {
    const source = sourceRef.current;
    const camera = cameraRef.current;
    if (!source || !camera || !sourceUrl || !ready || !cameraAvailable || !cameraStreamRef.current || audioContextRef.current) return;
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
  }, [sourceUrl, ready, cameraAvailable]);

  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return;
    // En mode « Moi d’abord », la lecture ne doit reprendre que lorsque
    // l’utilisateur le demande. Si le navigateur met la vidéo en pause
    // tout seul pendant sa lecture, on tente de la relancer.
    const recoverUnexpectedPause = () => {
      if (!recordingRef.current || explainingRef.current || source.ended || !source.paused) return;
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
  }, [sourceUrl, ready]);

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => setElapsed(Math.floor((performance.now() - startAtRef.current) / 1000)), 250);
    return () => window.clearInterval(interval);
  }, [recording]);

  const chooseVideo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Choisis un fichier vidéo.");
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setSourceName(file.name);
    setReady(false);
    setRecording(false);
    setExplaining(false);
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
      const audioStream = (source as HTMLVideoElement & { __reactionAudioStream?: MediaStream }).__reactionAudioStream;
      if (!audioStream) {
        toast.error("Le son n’est pas prêt. Choisis à nouveau la vidéo.");
        return;
      }
      audioStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
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
        setRecording(false);
        setExplaining(false);
        source.pause();
        if (blob.size < 1024) { toast.error("La vidéo enregistrée est vide. Réessaie."); return; }
        onVideoRecorded(blob, duration);
      };
      recorderRef.current = recorder;
      startAtRef.current = performance.now();
      source.currentTime = 0;
      const beginWithMe = startMode === "me";
      micGainRef.current!.gain.setTargetAtTime(beginWithMe ? 1 : 0, audioContextRef.current!.currentTime, 0.02);
      sourceGainRef.current!.gain.setTargetAtTime(beginWithMe ? 0 : 1, audioContextRef.current!.currentTime, 0.02);
      if (beginWithMe) {
        explainingRef.current = true;
        source.pause();
      } else {
        explainingRef.current = false;
        await source.play();
      }
      recorder.start(250);
      recordingRef.current = true;
      setRecording(true);
      setExplaining(beginWithMe);
    } catch (error) {
      console.error("[ReactionCameraRecorder] start", error);
      toast.error("Impossible de démarrer l’enregistrement. Réessaie.");
    }
  };

  const toggleExplain = () => {
    const source = sourceRef.current;
    const audio = audioContextRef.current;
    if (!recording || !source || !audio) return;
    if (!explaining) {
      explainingRef.current = true;
      source.pause();
      sourceGainRef.current?.gain.setTargetAtTime(0, audio.currentTime, 0.02);
      micGainRef.current?.gain.setTargetAtTime(1, audio.currentTime, 0.02);
      setExplaining(true);
    } else {
      explainingRef.current = false;
      micGainRef.current?.gain.setTargetAtTime(0, audio.currentTime, 0.02);
      sourceGainRef.current?.gain.setTargetAtTime(1, audio.currentTime, 0.02);
      source.play().catch(() => toast.error("Impossible de reprendre la vidéo originale."));
      setExplaining(false);
    }
  };

  const finish = () => {
    if (!recording || finishing) return;
    setFinishing(true);
    recordingRef.current = false;
    explainingRef.current = true;
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
          <h1 className="text-2xl font-bold">Réagir à une vidéo</h1>
          <p className="mt-2 text-sm text-white/65">Choisis la disposition de ta vidéo et de ta caméra avant de commencer.</p>
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
            <span className="max-w-[55%] truncate text-xs text-white/70">{sourceName || "Choisir une vidéo"}</span>
            <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-black">
              <ImagePlus size={16} /> Galerie
              <input type="file" accept="video/*" className="hidden" onChange={(event) => chooseVideo(event.target.files?.[0])} />
            </label>
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
              dragRef.current = { mode: px > b.x + b.w - 32 && py > b.y + b.h - 32 ? "resize" : "move", startX: px, startY: py, boxX: b.x, boxY: b.y, boxW: b.w, boxH: b.h };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const px = (event.clientX - rect.left) * (720 / rect.width);
              const py = (event.clientY - rect.top) * (1280 / rect.height);
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
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          />
            <video ref={sourceRef} src={sourceUrl || undefined} playsInline webkit-playsinline="true" preload="auto" className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0" onLoadedMetadata={() => { setReady(true); }} onCanPlay={() => setReady(true)} onError={() => { setReady(false); toast.error("Cette vidéo ne peut pas être lue sur cet appareil."); }} />
            {!sourceUrl && <div className="absolute inset-0 flex items-center justify-center text-center text-white/60"><div><Video size={42} className="mx-auto mb-3" /><p>Sélectionne une vidéo de ta galerie</p></div></div>}
            {sourceUrl && !ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Préparation de la vidéo…</div>}
          </div>
          <div className="z-20 space-y-3 bg-neutral-950 px-4 pb-5 pt-3">
            {recording && <div className="text-center text-sm font-semibold tabular-nums">{Math.floor(elapsed / 60).toString().padStart(2, "0")}:{Math.floor(elapsed % 60).toString().padStart(2, "0")} · {explaining ? "Ton explication" : "Vidéo originale"}</div>}
            {!recording && ready && <div className="space-y-2">
              <p className="text-center text-xs font-semibold text-white/75">Qui commence ?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setStartMode("me")} className={startMode === "me" ? "rounded-xl border border-red-400 bg-red-500/20 px-3 py-3 text-sm font-semibold" : "rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-semibold"}>Moi d’abord</button>
                <button onClick={() => setStartMode("original")} className={startMode === "original" ? "rounded-xl border border-red-400 bg-red-500/20 px-3 py-3 text-sm font-semibold" : "rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-semibold"}>Vidéo originale</button>
              </div>
            </div>}
            <div className="grid grid-cols-2 gap-2">
              {!recording ? <button onClick={start} disabled={!ready} className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-red-500 py-3 font-bold disabled:opacity-40"><Video size={18} /> Enregistrer la réaction</button> : <>
                <button onClick={toggleExplain} className="flex items-center justify-center gap-2 rounded-full bg-white py-3 font-bold text-black">{explaining ? <Play size={18} /> : <Pause size={18} />}{explaining ? "Reprendre la vidéo" : "Expliquer ce passage"}</button>
                <button onClick={finish} className="flex items-center justify-center gap-2 rounded-full bg-red-500 py-3 font-bold"><Check size={18} /> Terminer</button>
              </>}
            </div>
            <p className="text-center text-xs text-white/55">{recording ? (explaining ? "La vidéo originale est arrêtée : seule ta voix est enregistrée." : "La vidéo avance et sa voix est entendue. Appuie sur Expliquer pour l’arrêter.") : "Pendant l’explication, la vidéo s’arrête et ta voix prend le relais."}</p>
            {(layout === "pip-tr" || layout === "pip-bl") && <p className="text-center text-[11px] text-white/45">Déplace la vidéo avec le doigt. Tire le coin rouge pour l’agrandir ou la réduire.</p>}
            <div className="flex items-center justify-center gap-2 text-[11px] text-white/40"><Volume2 size={13} /> Le son alterne entre la vidéo originale et ton microphone.</div>
          </div>
        </>
      )}
    </div>
  );
}
