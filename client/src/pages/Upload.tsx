import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CameraRecorder } from "@/components/CameraRecorder";
import Publish from "./Publish";
import AudioSelector from "@/components/AudioSelector.tsx";
import { FilterLibrary, Filter } from "@/components/FilterLibrary";
import { EffectsLibrary } from "@/components/EffectsLibrary";
import { useUpload } from "@/contexts/UploadContext";
import {
  ArrowLeft, Music, Pause, Play, RotateCcw, Sparkles, Volume2, X,
  Scissors, Type, Smile, Captions, Wand2, Loader2
} from "lucide-react";
import { toast } from "sonner";

type Step = "capture" | "edit" | "publish";
type Tool = "trim" | "text" | "stickers" | "subtitles" | "models" | "autocut" | null;
type Overlay = { id: string; text: string; x: number; y: number; size: number; color: string; start: number; end: number; kind: "text" | "sticker" | "subtitle" };

const QUICK_FILTERS: { id: string; name: string; cssFilter: string }[] = [
  { id: "none", name: "Normal", cssFilter: "none" },
  { id: "smooth", name: "Smooth", cssFilter: "brightness(1.05) blur(.5px)" },
  { id: "vivid", name: "Vivid", cssFilter: "saturate(1.45) contrast(1.08)" },
  { id: "warm", name: "Warm", cssFilter: "sepia(.18) saturate(1.2)" },
  { id: "cinema", name: "Cinéma", cssFilter: "contrast(1.18) saturate(.9)" },
];

const STICKERS = ["❤️", "😂", "🔥", "😍", "✨", "👏", "🇨🇮", "🇬🇳", "🇸🇳", "🌍", "🎵", "💯"];

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { file, setFile, preview, setPreview, selectedMusic, setSelectedMusic } = useUpload();
  const [step, setStep] = useState<Step>("capture");
  const [showAudio, setShowAudio] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [tool, setTool] = useState<Tool>(null);
  const [editFilter, setEditFilter] = useState<{ id: string; cssFilter: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [overlaySize, setOverlaySize] = useState(30);
  const [isExporting, setIsExporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, setPreview]);

  useEffect(() => {
    if (!duration) return;
    setTrimEnd((current) => current > 0 ? Math.min(current, duration) : duration);
  }, [duration]);

  useEffect(() => {
    if (step !== "edit" || !videoRef.current) return;
    const video = videoRef.current;
    const onTime = () => {
      setProgress(video.duration ? video.currentTime / video.duration : 0);
      if (musicRef.current) musicRef.current.currentTime = video.currentTime;
    };
    const onPlay = () => { setIsPlaying(true); musicRef.current?.play().catch(() => {}); };
    const onPause = () => { setIsPlaying(false); musicRef.current?.pause(); };
    const onEnded = () => { setIsPlaying(false); setProgress(1); musicRef.current?.pause(); };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [step]);

  const currentSeconds = useMemo(() => progress * duration, [progress, duration]);
  const visibleOverlays = overlays.filter((item) => currentSeconds >= item.start && currentSeconds <= item.end);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {}); else video.pause();
  };

  const seek = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = value * video.duration;
    if (musicRef.current) musicRef.current.currentTime = video.currentTime;
    setProgress(value);
  };

  const resetMontagePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = trimStart;
    setProgress(video.duration ? trimStart / video.duration : 0);
    video.play().catch(() => {});
  };

  const addText = () => {
    const text = textDraft.trim();
    if (!text) return toast.error("Écris d'abord le texte");
    const start = Math.max(0, currentSeconds);
    const end = Math.min(duration || 9999, Math.max(start + 1, trimEnd || duration));
    setOverlays((items) => [...items, { id: crypto.randomUUID(), text, x: 50, y: 45, size: overlaySize, color: overlayColor, start, end, kind: "text" }]);
    setTextDraft("");
    toast.success("Texte ajouté au montage");
  };

  const addSticker = (sticker: string) => {
    const start = Math.max(0, currentSeconds);
    const end = Math.min(duration || 9999, Math.max(start + 1, trimEnd || duration));
    setOverlays((items) => [...items, { id: crypto.randomUUID(), text: sticker, x: 50, y: 35, size: 48, color: "#ffffff", start, end, kind: "sticker" }]);
    setTool(null);
  };

  const addSubtitle = () => {
    const text = subtitleDraft.trim();
    if (!text) return toast.error("Écris le sous-titre");
    const start = Math.max(0, currentSeconds);
    const end = Math.min(duration || 9999, Math.max(start + 1, trimEnd || duration));
    setOverlays((items) => [...items, { id: crypto.randomUUID(), text, x: 50, y: 84, size: 24, color: "#ffffff", start, end, kind: "subtitle" }]);
    setSubtitleDraft("");
    toast.success("Sous-titre ajouté");
  };

  const applyModel = (name: string) => {
    if (!duration) return;
    if (name === "Rapide") {
      const end = Math.min(duration, 15);
      setTrimStart(0); setTrimEnd(end);
    } else if (name === "Focus") {
      const length = Math.min(duration, 10);
      const start = Math.max(0, (duration - length) / 2);
      setTrimStart(start); setTrimEnd(start + length);
    } else {
      setTrimStart(0); setTrimEnd(duration);
    }
    toast.success(`Modèle « ${name} » appliqué`);
    setTool(null);
  };

  const applyAutoCut = () => {
    if (!duration) return toast.error("La vidéo n'est pas encore chargée");
    const target = Math.min(duration, 15);
    const start = duration > target ? Math.max(0, (duration - target) / 2) : 0;
    setTrimStart(start);
    setTrimEnd(start + target);
    setTool(null);
    toast.success("AutoCut a sélectionné un passage de 15 s");
  };

  const exportMontage = async (): Promise<boolean> => {
    const video = videoRef.current;
    if (!video || !file || isImageFile(file)) return true;
    if (isExporting) return false;
    const start = Math.max(0, Math.min(trimStart, duration));
    const end = Math.max(start + 0.2, Math.min(trimEnd || duration, duration));
    if (end <= start) { toast.error("La plage de montage est invalide"); return false; }

    setIsExporting(true);
    try {
      video.pause();
      video.currentTime = start;
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; video.removeEventListener("seeked", finish); resolve(); };
        video.addEventListener("seeked", finish, { once: true });
        window.setTimeout(finish, 800);
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponible");
      const canvasStream = canvas.captureStream(30);
      let audioContext: AudioContext | null = null;
      let audio: HTMLAudioElement | null = null;
      if (selectedMusic?.url) {
        audio = new Audio(selectedMusic.url);
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        audio.currentTime = start;
        audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audio);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);
        const track = destination.stream.getAudioTracks()[0];
        if (track) canvasStream.addTrack(track);
        await audioContext.resume();
        await audio.play().catch(() => {});
      }

      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mime ? new MediaRecorder(canvasStream, { mimeType: mime }) : new MediaRecorder(canvasStream);
      const chunks: Blob[] = [];
      const draw = () => {
        if (video.currentTime >= end || video.ended) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const t = video.currentTime;
        for (const item of overlays) {
          if (t < item.start || t > item.end) continue;
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `${item.kind === "sticker" ? "normal" : "bold"} ${item.size}px sans-serif`;
          ctx.lineWidth = item.kind === "subtitle" ? 8 : 5;
          ctx.strokeStyle = "rgba(0,0,0,.75)";
          ctx.strokeText(item.text, canvas.width * item.x / 100, canvas.height * item.y / 100);
          ctx.fillStyle = item.color;
          ctx.fillText(item.text, canvas.width * item.x / 100, canvas.height * item.y / 100);
          ctx.restore();
        }
        requestAnimationFrame(draw);
      };
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      });
      recorder.start(250);
      draw();
      await video.play();
      await new Promise<void>((resolve) => {
        const check = () => {
          if (video.currentTime >= end || video.ended) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
      video.pause();
      recorder.stop();
      const blob = await finished;
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
      if (audioContext) await audioContext.close().catch(() => {});
      if (blob.size < 1024) throw new Error("Export vidéo vide");
      setFile(new File([blob], "afritok-montage.webm", { type: blob.type }));
      toast.success("Montage exporté et prêt pour la publication");
      return true;
    } catch (error) {
      console.error("[Upload] montage export", error);
      toast.error("Impossible d'exporter le montage sur cet appareil");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAuthenticated) return <div className="h-screen bg-black flex items-center justify-center text-white">Connexion requise</div>;

  if (step === "capture") {
    return (
      <>
        <CameraRecorder
          onVideoRecorded={(blob, recordedDuration) => {
            if (blob.size < 1024) return toast.error("La vidéo enregistrée est vide. Réessaie.");
            setFile(new File([blob], "video.webm", { type: blob.type || "video/webm" }));
            setStep("edit");
            toast.success(`Vidéo prête pour le montage · ${recordedDuration}s`);
          }}
          onPhotoTaken={(blob) => { setFile(new File([blob], "photo.jpg", { type: "image/jpeg" })); setStep("edit"); }}
          onClose={() => navigate("/feed")}
          onOpenMusic={() => setShowAudio(true)}
          selectedMusic={selectedMusic}
        />
        {showAudio && <AudioSelector onClose={() => setShowAudio(false)} onSelectAudio={(url, name) => { setSelectedMusic({ url, name }); setShowAudio(false); }} />}
      </>
    );
  }

  if (step === "edit") {
    const isImage = isImageFile(file);
    const openTool = (next: Tool) => setTool(next);
    return (
      <div className="h-screen bg-black text-white overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 bottom-[116px] flex items-center justify-center bg-black">
          {isImage ? (
            <img src={preview || ""} alt="Aperçu" className="w-full h-full object-cover" style={{ filter: editFilter?.cssFilter || "none" }} />
          ) : (
            <video ref={videoRef} src={preview || ""} autoPlay muted playsInline className="w-full h-full object-cover" style={{ filter: editFilter?.cssFilter || "none" }} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} onClick={togglePlayback} />
          )}

          {!isImage && visibleOverlays.map((item) => (
            <div key={item.id} className="absolute pointer-events-none select-none font-bold text-center" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)", fontSize: item.size, color: item.color, textShadow: "0 2px 6px #000, 0 0 2px #000", whiteSpace: "pre-wrap", maxWidth: "85%" }}>
              {item.text}
            </div>
          ))}

          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent">
            <button onClick={() => setStep("capture")} className="p-2 rounded-full bg-black/35" aria-label="Retour"><ArrowLeft size={25} /></button>
            <button onClick={() => setShowAudio(true)} className="rounded-full bg-black/50 px-5 py-2.5 text-sm font-bold flex items-center gap-2 max-w-[55%] truncate"><Music size={17} /><span className="truncate">{selectedMusic?.name || "Ajouter un son"}</span></button>
            <button onClick={resetMontagePlayback} className="p-2 rounded-full bg-black/35" aria-label="Recommencer"><RotateCcw size={22} /></button>
          </div>

          {!isImage && !isPlaying && <button onClick={togglePlayback} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-black/55 backdrop-blur flex items-center justify-center" aria-label="Lire"><Play size={30} fill="white" /></button>}

          <div className="absolute right-3 top-24 flex flex-col gap-3 max-h-[65%] overflow-y-auto">
            <ToolButton icon={<Scissors size={21} />} label="Modifier" onClick={() => openTool("trim")} />
            <ToolButton icon={<Type size={21} />} label="Texte" onClick={() => openTool("text")} />
            <ToolButton icon={<Smile size={21} />} label="Stickers" onClick={() => openTool("stickers")} />
            <ToolButton icon={<Captions size={21} />} label="Sous-titres" onClick={() => openTool("subtitles")} />
            <ToolButton icon={<Wand2 size={21} />} label="Modèles" onClick={() => openTool("models")} />
            <ToolButton icon={<Sparkles size={21} />} label="Effets" onClick={() => setShowEffects(true)} />
            <ToolButton icon={<Sparkles size={21} />} label="Filtres" onClick={() => setShowFilters(true)} />
            <ToolButton icon={<Volume2 size={21} />} label="Audio" onClick={() => setShowAudio(true)} />
          </div>

          {!isImage && <div className="absolute left-4 right-4 bottom-5"><div className="flex items-center gap-3"><button onClick={togglePlayback} className="h-9 w-9 rounded-full bg-black/55 flex items-center justify-center" aria-label={isPlaying ? "Pause" : "Lecture"}>{isPlaying ? <Pause size={17} /> : <Play size={17} fill="white" />}</button><input type="range" min="0" max="1" step="0.001" value={progress} onChange={(e) => seek(Number(e.target.value))} className="flex-1 accent-red-500" aria-label="Position dans la vidéo" /><span className="text-[11px] tabular-nums bg-black/45 px-2 py-1 rounded-full">{formatTime(currentSeconds)}</span></div></div>}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[116px] bg-black px-4 py-3 z-20"><div className="flex items-center gap-2 mb-3 overflow-x-auto"><button onClick={() => setTool("autocut")} className="text-xs flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-full whitespace-nowrap"><Wand2 size={14} /> AutoCut</button><button onClick={() => setShowAudio(true)} className="text-xs flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-full whitespace-nowrap"><Music size={14} /> Son</button><span className="text-[11px] text-white/50 whitespace-nowrap">{overlays.length} élément(s)</span></div><div className="flex gap-3"><button onClick={() => navigate("/feed")} className="flex-1 py-3 rounded-full bg-white/10 font-bold text-sm">Annuler</button><button onClick={exportMontage} disabled={isExporting} className="flex-1 py-3 rounded-full bg-red-500 font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">{isExporting ? <><Loader2 size={17} className="animate-spin" /> Export...</> : "Enregistrer le montage"}</button><button onClick={async () => { const ok = await exportMontage(); if (ok) setStep("publish"); }} disabled={isExporting} className="flex-1 py-3 rounded-full bg-white font-bold text-sm text-black">Suivant</button></div></div>

        {tool && <div className="absolute inset-0 z-50 bg-black/96 p-4 overflow-y-auto"><div className="flex justify-between items-center mb-5"><h2 className="font-bold text-lg">{toolTitle(tool)}</h2><button onClick={() => setTool(null)}><X /></button></div>{tool === "trim" && <TrimPanel duration={duration} start={trimStart} end={trimEnd} onStart={setTrimStart} onEnd={setTrimEnd} onPreview={() => { if (videoRef.current) { videoRef.current.currentTime = trimStart; videoRef.current.play().catch(() => {}); } setTool(null); }} />}{tool === "text" && <OverlayPanel title="Ajouter du texte" value={textDraft} setValue={setTextDraft} size={overlaySize} setSize={setOverlaySize} color={overlayColor} setColor={setOverlayColor} onAdd={addText} items={overlays.filter((o) => o.kind === "text")} onDelete={(id) => setOverlays((items) => items.filter((o) => o.id !== id))} />}{tool === "stickers" && <StickerPanel onAdd={addSticker} items={overlays.filter((o) => o.kind === "sticker")} onDelete={(id) => setOverlays((items) => items.filter((o) => o.id !== id))} />}{tool === "subtitles" && <OverlayPanel title="Ajouter un sous-titre" value={subtitleDraft} setValue={setSubtitleDraft} size={24} setSize={() => {}} color="#ffffff" setColor={() => {}} onAdd={addSubtitle} items={overlays.filter((o) => o.kind === "subtitle")} onDelete={(id) => setOverlays((items) => items.filter((o) => o.id !== id))} />}{tool === "models" && <ModelPanel onApply={applyModel} />}{tool === "autocut" && <div className="space-y-4"><p className="text-white/70 text-sm">AutoCut sélectionne automatiquement un passage court et prêt à publier.</p><button onClick={applyAutoCut} className="w-full py-3 rounded-xl bg-red-500 font-bold">Appliquer AutoCut</button></div>}</div>}

        {showFilters && <div className="absolute inset-0 z-50 bg-black/95 p-4 overflow-y-auto"><div className="flex justify-between items-center mb-5"><h2 className="font-bold">Filtres</h2><button onClick={() => setShowFilters(false)}><X /></button></div><div className="flex gap-3 overflow-x-auto pb-4">{QUICK_FILTERS.map((filter) => <button key={filter.id} onClick={() => { setEditFilter(filter); setShowFilters(false); }} className="min-w-[70px] text-center"><div className="h-14 rounded-xl bg-white/10 border border-white/10" style={{ filter: filter.cssFilter }} /><span className="text-[10px]">{filter.name}</span></button>)}</div><FilterLibrary onFilterSelect={(filter: Filter) => { setEditFilter({ id: filter.id, cssFilter: filter.cssFilter || "none" }); setShowFilters(false); }} selectedFilters={editFilter ? [editFilter.id] : []} onFilterRemove={() => setEditFilter(null)} /></div>}
        {showEffects && <div className="absolute inset-0 z-50 bg-black/95 p-4 overflow-y-auto"><div className="flex justify-between items-center mb-5"><h2 className="font-bold">Effets</h2><button onClick={() => setShowEffects(false)}><X /></button></div><EffectsLibrary onEffectSelect={(effect) => toast.info(`Effet « ${effect.name} » disponible dans la bibliothèque`)} selectedEffects={[]} onEffectRemove={() => {}} /></div>}
        {showAudio && <AudioSelector onClose={() => setShowAudio(false)} onSelectAudio={(url, name) => { setSelectedMusic({ url, name }); setShowAudio(false); }} />}
        {selectedMusic && <audio ref={musicRef} src={selectedMusic.url} preload="auto" />}
      </div>
    );
  }

  return <Publish />;
}

function isImageFile(file: File | null) { return !!file?.type.startsWith("image/"); }
function formatTime(value: number) { return `${Math.floor(value / 60).toString().padStart(2, "0")}:${Math.floor(value % 60).toString().padStart(2, "0")}`; }
function toolTitle(tool: Tool) { return ({ trim: "Modifier la vidéo", text: "Texte", stickers: "Stickers", subtitles: "Sous-titres", models: "Modèles", autocut: "AutoCut" } as Record<string, string>)[tool || ""] || "Montage"; }
function ToolButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex flex-col items-center gap-1 shrink-0"><span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center">{icon}</span><span className="text-[11px] font-semibold">{label}</span></button>; }
function TrimPanel({ duration, start, end, onStart, onEnd, onPreview }: { duration: number; start: number; end: number; onStart: (v: number) => void; onEnd: (v: number) => void; onPreview: () => void }) { return <div className="space-y-5"><p className="text-sm text-white/70">Choisis précisément le début et la fin. Le montage exporté contiendra uniquement cette partie.</p><div><label className="text-xs text-white/60">Début · {formatTime(start)}</label><input className="w-full" type="range" min="0" max={duration || 1} step="0.1" value={start} onChange={(e) => onStart(Math.min(Number(e.target.value), Math.max(0, end - 0.2)))} /></div><div><label className="text-xs text-white/60">Fin · {formatTime(end)}</label><input className="w-full" type="range" min="0" max={duration || 1} step="0.1" value={end || duration} onChange={(e) => onEnd(Math.max(Number(e.target.value), start + 0.2))} /></div><div className="flex gap-3"><button onClick={() => { onStart(0); onEnd(duration); }} className="flex-1 py-3 rounded-xl bg-white/10">Tout garder</button><button onClick={onPreview} className="flex-1 py-3 rounded-xl bg-red-500 font-bold">Prévisualiser</button></div></div>; }
function OverlayPanel({ title, value, setValue, size, setSize, color, setColor, onAdd, items, onDelete }: { title: string; value: string; setValue: (v: string) => void; size: number; setSize: (v: number) => void; color: string; setColor: (v: string) => void; onAdd: () => void; items: Overlay[]; onDelete: (id: string) => void }) { return <div className="space-y-4"><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Écris ici..." className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none" /><div><div className="flex justify-between text-xs text-white/60"><span>Taille</span><span>{size}px</span></div><input type="range" min="16" max="72" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" /></div><div className="flex items-center gap-3"><span className="text-xs text-white/60">Couleur</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 bg-transparent" /></div><button onClick={onAdd} className="w-full py-3 rounded-xl bg-red-500 font-bold">Ajouter au moment actuel</button><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"><span className="truncate">{item.text}</span><button onClick={() => onDelete(item.id)} className="p-2 text-red-300"><X size={17} /></button></div>)}</div></div>; }
function StickerPanel({ onAdd, items, onDelete }: { onAdd: (v: string) => void; items: Overlay[]; onDelete: (id: string) => void }) { return <div className="space-y-5"><div className="grid grid-cols-4 gap-3">{STICKERS.map((sticker) => <button key={sticker} onClick={() => onAdd(sticker)} className="text-3xl rounded-xl bg-white/10 py-4">{sticker}</button>)}</div><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"><span className="text-2xl">{item.text}</span><button onClick={() => onDelete(item.id)} className="p-2 text-red-300"><X size={17} /></button></div>)}</div></div>; }
function ModelPanel({ onApply }: { onApply: (name: string) => void }) { return <div className="grid gap-3">{["Rapide", "Focus", "Complet"].map((name) => <button key={name} onClick={() => onApply(name)} className="rounded-xl bg-white/10 p-4 text-left"><div className="font-bold">{name}</div><div className="text-xs text-white/60 mt-1">{name === "Rapide" ? "Premières 15 secondes" : name === "Focus" ? "10 secondes autour du milieu" : "Toute la vidéo"}</div></button>)}</div>; }
