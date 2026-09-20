import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CameraRecorder } from "@/components/CameraRecorder";
import Publish from "./Publish";
import AudioSelector from "@/components/AudioSelector.tsx";
import { FilterLibrary, Filter } from "@/components/FilterLibrary";
import { EffectsLibrary } from "@/components/EffectsLibrary";
import { VideoTimeline } from "@/components/VideoTimeline";
import { ClipEditorFixed } from "@/components/ClipEditorFixed";
import { useUpload } from "@/contexts/UploadContext";
import { montageFilter } from "@/lib/montage-effects";
import {
  ArrowLeft, Music, Pause, Play, RotateCcw, Sparkles, Volume2, X,
  Scissors, Type, Smile, Captions, Wand2, Loader2, Trash2, Check,
} from "lucide-react";
import { toast } from "sonner";

type Step = "capture" | "edit" | "publish";
type Tool = "trim" | "text" | "stickers" | "subtitles" | "models" | "autocut" | null;
type CutRange = { start: number; end: number };
type Overlay = {
  id: string; text: string; x: number; y: number; size: number; color: string;
  start: number; end: number; kind: "text" | "sticker" | "subtitle";
};

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
  const [editorClips, setEditorClips] = useState<File[]>([]);
  const [step, setStep] = useState<Step>("capture");
  const [showAudio, setShowAudio] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showModifierEditor, setShowModifierEditor] = useState(false);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [editFilter, setEditFilter] = useState<{ id: string; cssFilter: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [cuts, setCuts] = useState<CutRange[]>([]);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(0);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [overlaySize, setOverlaySize] = useState(30);
  const [isExporting, setIsExporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, setPreview]);

  useEffect(() => {
    if (!duration) return;
    setTrimEnd((value) => value > 0 ? Math.min(value, duration) : duration);
    setCutEnd((value) => value > 0 ? Math.min(value, duration) : Math.min(duration, 5));
  }, [duration]);

  useEffect(() => {
    if (step !== "edit" || !videoRef.current) return;
    const video = videoRef.current;
    const onTime = () => {
      const current = video.currentTime;
      const cut = cuts.find((range) => current >= range.start && current < range.end);
      if (cut) {
        video.currentTime = Math.min(cut.end, trimEnd || duration);
        return;
      }
      if (trimEnd > trimStart && current >= trimEnd) {
        video.pause();
        video.currentTime = trimEnd;
        setProgress(duration ? trimEnd / duration : 0);
        return;
      }
      setProgress(video.duration ? current / video.duration : 0);
      if (musicRef.current && Math.abs(musicRef.current.currentTime - current) > 0.25) musicRef.current.currentTime = current;
    };
    const onPlay = () => { setIsPlaying(true); musicRef.current?.play().catch(() => {}); };
    const onPause = () => { setIsPlaying(false); musicRef.current?.pause(); };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [step, cuts, trimStart, trimEnd, duration]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = draggingRef.current;
      const stage = stageRef.current;
      if (!drag || !stage) return;
      const rect = stage.getBoundingClientRect();
      const x = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100 - drag.offsetX));
      const y = Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100 - drag.offsetY));
      setOverlays((items) => items.map((item) => item.id === drag.id ? { ...item, x, y } : item));
    };
    const up = () => { draggingRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  const currentSeconds = useMemo(() => progress * duration, [progress, duration]);
  const visibleOverlays = overlays.filter((item) => currentSeconds >= item.start && currentSeconds <= item.end);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime >= trimEnd || video.currentTime < trimStart) video.currentTime = trimStart;
      video.play().catch(() => {});
    } else video.pause();
  };

  const setTimelineTime = (time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const safe = Math.max(trimStart, Math.min(time, trimEnd || duration));
    const cut = cuts.find((range) => safe >= range.start && safe < range.end);
    const target = cut ? Math.min(cut.end, trimEnd || duration) : safe;
    video.currentTime = target;
    setProgress(video.duration ? target / video.duration : 0);
    if (musicRef.current) musicRef.current.currentTime = target;
  };

  const setTimelineTrim = (start: number, end: number) => {
    const safeStart = Math.max(0, Math.min(start, Math.max(0, end - 0.1)));
    const safeEnd = Math.min(duration || end, Math.max(end, safeStart + 0.1));
    setTrimStart(safeStart);
    setTrimEnd(safeEnd);
    const video = videoRef.current;
    if (video && (video.currentTime < safeStart || video.currentTime > safeEnd)) setTimelineTime(safeStart);
  };

  const resetMontagePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setTimelineTime(trimStart);
    video.play().catch(() => {});
  };

  const overlayTiming = () => {
    const start = Math.max(trimStart, Math.min(currentSeconds, trimEnd || duration || currentSeconds));
    const end = Math.min(trimEnd || duration || 9999, Math.max(start + 1, trimEnd || duration || start + 1));
    return { start, end };
  };

  const addText = () => {
    const text = textDraft.trim();
    if (!text) return toast.error("Écris d'abord le texte");
    const { start, end } = overlayTiming();
    const id = crypto.randomUUID();
    setOverlays((items) => [...items, { id, text, x: 50, y: 45, size: overlaySize, color: overlayColor, start, end, kind: "text" }]);
    setSelectedOverlayId(id); setTextDraft("");
  };
  const addSticker = (sticker: string) => {
    const { start, end } = overlayTiming();
    const id = crypto.randomUUID();
    setOverlays((items) => [...items, { id, text: sticker, x: 50, y: 35, size: 48, color: "#fff", start, end, kind: "sticker" }]);
    setSelectedOverlayId(id);
  };
  const addSubtitle = () => {
    const text = subtitleDraft.trim();
    if (!text) return toast.error("Écris le sous-titre");
    const { start, end } = overlayTiming();
    const id = crypto.randomUUID();
    setOverlays((items) => [...items, { id, text, x: 50, y: 84, size: 24, color: "#fff", start, end, kind: "subtitle" }]);
    setSelectedOverlayId(id); setSubtitleDraft("");
  };
  const deleteOverlay = (id: string) => {
    setOverlays((items) => items.filter((item) => item.id !== id));
    setSelectedOverlayId((current) => current === id ? null : current);
  };
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, item: Overlay) => {
    event.preventDefault(); event.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    draggingRef.current = { id: item.id, offsetX: ((event.clientX - rect.left) / rect.width) * 100 - item.x, offsetY: ((event.clientY - rect.top) / rect.height) * 100 - item.y };
    setSelectedOverlayId(item.id);
  };

  const mergeCuts = (ranges: CutRange[]) => ranges.filter((r) => r.end > r.start).sort((a, b) => a.start - b.start).reduce<CutRange[]>((acc, range) => {
    const last = acc[acc.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end); else acc.push({ ...range });
    return acc;
  }, []);

  const addCut = (start: number, end: number) => {
    const safeStart = Math.max(trimStart, Math.min(start, trimEnd || duration));
    const safeEnd = Math.min(trimEnd || duration, Math.max(end, safeStart + 0.1));
    if (!duration || safeEnd <= safeStart) return toast.error("Sélection de coupe invalide");
    setCuts(mergeCuts([...cuts, { start: safeStart, end: safeEnd }]));
    setCutStart(safeStart); setCutEnd(safeEnd);
    setTimelineTime(safeEnd);
    toast.success(`Partie supprimée · ${formatTime(safeStart)} → ${formatTime(safeEnd)}`);
  };
  const removeFront = () => {
    if (currentSeconds <= trimStart + 0.1) return toast.error("Place la lecture après le début");
    setTimelineTrim(currentSeconds, trimEnd || duration);
  };
  const removeBack = () => {
    if (currentSeconds >= (trimEnd || duration) - 0.1) return toast.error("Place la lecture avant la fin");
    setTimelineTrim(trimStart, currentSeconds);
  };
  const removeMiddle = () => addCut(Math.min(cutStart, cutEnd), Math.max(cutStart, cutEnd));
  const deleteCut = (index: number) => setCuts((items) => items.filter((_, i) => i !== index));

  const applyModel = (name: string) => {
    if (!duration) return;
    if (name === "Rapide") setTimelineTrim(0, Math.min(duration, 15));
    else if (name === "Focus") { const length = Math.min(duration, 10); const start = Math.max(0, (duration - length) / 2); setTimelineTrim(start, start + length); }
    else setTimelineTrim(0, duration);
    setTool(null);
  };
  const applyAutoCut = () => {
    if (!duration) return toast.error("La vidéo n'est pas encore chargée");
    const length = Math.min(duration, 15); const start = duration > length ? (duration - length) / 2 : 0;
    setTimelineTrim(start, start + length); setTool(null);
  };

  const exportMontage = async (): Promise<boolean> => {
    const video = videoRef.current;
    if (!video || !file || isImageFile(file)) return true;
    if (isExporting) return false;
    const start = Math.max(0, Math.min(trimStart, duration));
    const end = Math.max(start + 0.2, Math.min(trimEnd || duration, duration));
    if (end <= start) return false;
    setIsExporting(true);
    try {
      video.pause(); video.currentTime = start;
      await waitForSeek(video);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720; canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas indisponible");
      const stream = canvas.captureStream(30);
      let audioContext: AudioContext | null = null;
      let audio: HTMLAudioElement | null = null;
      if (selectedMusic?.url) {
        audio = new Audio(selectedMusic.url); audio.crossOrigin = "anonymous"; audio.preload = "auto"; audio.currentTime = start;
        audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audio);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination); const track = destination.stream.getAudioTracks()[0]; if (track) stream.addTrack(track);
        await audioContext.resume(); await audio.play().catch(() => {});
      }
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const finished = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" })); });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const activeCuts = mergeCuts(cuts.filter((range) => range.end > start && range.start < end));
      let drawing = true;
      const draw = () => {
        if (!drawing || video.currentTime >= end || video.ended) return;
        const cut = activeCuts.find((range) => video.currentTime >= range.start && video.currentTime < range.end);
        if (cut) { video.currentTime = Math.min(cut.end, end); requestAnimationFrame(draw); return; }
        ctx.filter = montageFilter(editFilter?.cssFilter, activeEffect);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
        for (const item of overlays) {
          if (video.currentTime < item.start || video.currentTime > item.end) continue;
          ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.font = `${item.kind === "sticker" ? "normal" : "bold"} ${item.size}px sans-serif`;
          ctx.lineWidth = item.kind === "subtitle" ? 8 : 5; ctx.strokeStyle = "rgba(0,0,0,.75)";
          ctx.strokeText(item.text, canvas.width * item.x / 100, canvas.height * item.y / 100);
          ctx.fillStyle = item.color; ctx.fillText(item.text, canvas.width * item.x / 100, canvas.height * item.y / 100); ctx.restore();
        }
        requestAnimationFrame(draw);
      };
      recorder.start(250); drawing = true; draw(); await video.play();
      await new Promise<void>((resolve) => {
        const check = () => {
          if (video.currentTime >= end || video.ended) return resolve();
          const cut = activeCuts.find((range) => video.currentTime >= range.start && video.currentTime < range.end);
          if (cut) video.currentTime = Math.min(cut.end, end);
          requestAnimationFrame(check);
        }; check();
      });
      drawing = false; video.pause(); recorder.stop();
      const blob = await finished;
      audio?.pause(); audio?.removeAttribute("src"); audio?.load(); if (audioContext) await audioContext.close().catch(() => {});
      if (blob.size < 1024) throw new Error("Export vide");
      setFile(new File([blob], "afritok-montage.webm", { type: blob.type || "video/webm" }));
      toast.success("Montage exporté"); return true;
    } catch (error) {
      console.error("[Upload] montage export", error); toast.error("Impossible d'exporter le montage sur cet appareil"); return false;
    } finally { setIsExporting(false); }
  };

  if (!isAuthenticated) return <div className="h-screen bg-black flex items-center justify-center text-white">Connexion requise</div>;
  if (step === "capture") return <><CameraRecorder onVideoRecorded={(blob, recordedDuration) => { if (blob.size < 1024) return toast.error("La vidéo enregistrée est vide. Réessaie."); const recordedFile = new File([blob], "video.webm", { type: blob.type || "video/webm" }); setFile(recordedFile); setEditorClips([recordedFile]); setStep("edit"); toast.success(`Vidéo prête pour le montage · ${recordedDuration}s`); }} onPhotoTaken={(blob) => { setFile(new File([blob], "photo.jpg", { type: "image/jpeg" })); setStep("edit"); }} onClose={() => navigate("/feed")} onOpenMusic={() => setShowAudio(true)} selectedMusic={selectedMusic} />{showAudio && <AudioSelector onClose={() => setShowAudio(false)} onSelectAudio={(url, name) => { setSelectedMusic({ url, name }); setShowAudio(false); }} />}</>;
  if (step === "edit") {
    const isImage = isImageFile(file);
    const selectedOverlay = overlays.find((item) => item.id === selectedOverlayId) || null;
    return <div className="h-screen w-full max-w-full bg-black text-white overflow-hidden overflow-x-hidden relative">
      <div ref={stageRef} className="absolute inset-x-0 top-0 bottom-[235px] w-full max-w-full flex items-center justify-center bg-black touch-none overflow-hidden">
        {isImage ? <img src={preview || ""} alt="Aperçu" className="w-full h-full object-contain" style={{ filter: montageFilter(editFilter?.cssFilter, activeEffect) }} /> : <video ref={videoRef} src={preview || ""} autoPlay muted playsInline className="w-full h-full object-contain" style={{ filter: montageFilter(editFilter?.cssFilter, activeEffect) }} onLoadedMetadata={(e) => {
          const rawDuration = e.currentTarget.duration;

          if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
            return;
          }

          setDuration(rawDuration);

          setTrimEnd(value =>
            value > 0
              ? Math.min(value, rawDuration)
              : rawDuration
          );
        }} onClick={togglePlayback} />}
        {visibleOverlays.map((item) => <div key={item.id} onPointerDown={(event) => startDrag(event, item)} onClick={(event) => { event.stopPropagation(); setSelectedOverlayId(item.id); }} className={`absolute select-none font-bold text-center cursor-move ${selectedOverlayId === item.id ? "ring-2 ring-white/80 rounded-lg px-2 py-1" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)", fontSize: item.size, color: item.color, textShadow: "0 2px 6px #000, 0 0 2px #000", whiteSpace: "pre-wrap", maxWidth: "85%", zIndex: 10, touchAction: "none" }}>{item.text}</div>)}
        {tool === "text" && (
          <div
            className="absolute pointer-events-none font-bold text-center"
            style={{
              left: "50%", top: "45%", transform: "translate(-50%, -50%)",
              fontSize: overlaySize, color: overlayColor,
              textShadow: "0 2px 6px #000, 0 0 2px #000",
              whiteSpace: "pre-wrap", maxWidth: "85%", zIndex: 25,
            }}
          >
            {textDraft || <span className="opacity-35">Écris ton texte...</span>}
          </div>
        )}
        {selectedOverlay && <div className="absolute left-1/2 top-16 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-black/70 px-2 py-1.5"><span className="text-[11px] px-2">{selectedOverlay.kind === "sticker" ? "Sticker" : selectedOverlay.kind === "subtitle" ? "Sous-titre" : "Texte"}</span><button onClick={() => deleteOverlay(selectedOverlay.id)} className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center" aria-label="Supprimer"><Trash2 size={15} /></button><button onClick={() => setSelectedOverlayId(null)} className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center" aria-label="Fermer"><Check size={15} /></button></div>}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent z-20"><button onClick={() => setStep("capture")} className="p-2 rounded-full bg-black/35" aria-label="Retour"><ArrowLeft size={25} /></button><button onClick={() => setShowAudio(true)} className="rounded-full bg-black/50 px-5 py-2.5 text-sm font-bold flex items-center gap-2 max-w-[55%] truncate"><Music size={17} /><span className="truncate">{selectedMusic?.name || "Ajouter un son"}</span></button><button onClick={resetMontagePlayback} className="p-2 rounded-full bg-black/35" aria-label="Recommencer"><RotateCcw size={22} /></button></div>
        {!isImage && !isPlaying && !tool && <button onClick={togglePlayback} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-black/55 flex items-center justify-center z-20" aria-label="Lire"><Play size={30} fill="white" /></button>}
        <div className="absolute right-3 top-24 flex flex-col gap-3 max-h-[65%] overflow-y-auto z-20"><ToolButton icon={<Scissors size={21} />} label="Modifier" onClick={() => setShowModifierEditor(true)} /><ToolButton icon={<Type size={21} />} label="Texte" onClick={() => setTool("text")} /><ToolButton icon={<Smile size={21} />} label="Stickers" onClick={() => setTool("stickers")} /><ToolButton icon={<Captions size={21} />} label="Sous-titres" onClick={() => setTool("subtitles")} /><ToolButton icon={<Wand2 size={21} />} label="Modèles" onClick={() => setTool("models")} /><ToolButton icon={<Sparkles size={21} />} label="Effets" onClick={() => setShowEffects(true)} /><ToolButton icon={<Sparkles size={21} />} label="Filtres" onClick={() => setShowFilters(true)} /><ToolButton icon={<Volume2 size={21} />} label="Audio" onClick={() => setShowAudio(true)} /></div>
      </div>

      {!isImage && <div className="absolute bottom-[116px] left-0 right-0 h-[119px] z-30 bg-black"><VideoTimeline src={preview || ""} currentTime={currentSeconds} duration={duration} trimStart={trimStart} trimEnd={trimEnd || duration} cuts={cuts} onCurrentTimeChange={setTimelineTime} onTrimChange={setTimelineTrim} onCutsChange={setCuts} onDurationChange={setDuration} /></div>}
      <div className="absolute bottom-0 left-0 right-0 h-[116px] bg-black px-4 py-3 z-40"><div className="flex items-center gap-2 mb-3 overflow-x-auto"><button onClick={() => setTool("autocut")} className="text-xs flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-full whitespace-nowrap"><Wand2 size={14} /> AutoCut</button><button onClick={() => setShowAudio(true)} className="text-xs flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-full whitespace-nowrap"><Music size={14} /> Son</button><span className="text-[11px] text-white/50 whitespace-nowrap">{cuts.length} coupe(s) · {overlays.length} élément(s)</span></div><div className="flex gap-3"><button onClick={() => navigate("/feed")} className="flex-1 py-3 rounded-full bg-white/10 font-bold text-sm">Annuler</button><button onClick={exportMontage} disabled={isExporting} className="flex-1 py-3 rounded-full bg-red-500 font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">{isExporting ? <><Loader2 size={17} className="animate-spin" /> Export...</> : "Enregistrer"}</button><button onClick={async () => { const ok = await exportMontage(); if (ok) setStep("publish"); }} disabled={isExporting} className="flex-1 py-3 rounded-full bg-white font-bold text-sm text-black">Suivant</button></div></div>

      {tool && <div className="absolute left-0 right-0 bottom-[116px] z-50 w-full max-w-full min-w-0 max-h-[58vh] overflow-y-auto overflow-x-hidden rounded-t-3xl bg-[#101010] border-t border-white/10 p-4 pb-6"><div className="flex justify-between items-center mb-4"><button onClick={() => setTool(null)} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center" aria-label="Retour"><ArrowLeft /></button><h2 className="font-bold text-lg flex-1 text-center">{toolTitle(tool)}</h2><div className="w-9" /></div>{tool === "trim" && <TrimPanel duration={duration} start={trimStart} end={trimEnd || duration} current={currentSeconds} cutStart={cutStart} cutEnd={cutEnd || Math.min(duration, 5)} cuts={cuts} onCutStart={setCutStart} onCutEnd={setCutEnd} onRemoveFront={removeFront} onRemoveBack={removeBack} onRemoveMiddle={removeMiddle} onDeleteCut={deleteCut} onPreview={() => { setTimelineTime(trimStart); videoRef.current?.play().catch(() => {}); setTool(null); }} />}{tool === "text" && <InlineTextPanel value={textDraft} setValue={setTextDraft} size={overlaySize} setSize={setOverlaySize} color={overlayColor} setColor={setOverlayColor} onAdd={addText} items={overlays.filter((o) => o.kind === "text")} onDelete={deleteOverlay} onDone={() => setTool(null)} />}{tool === "stickers" && <InlineStickerPanel onAdd={addSticker} items={overlays.filter((o) => o.kind === "sticker")} onDelete={deleteOverlay} onDone={() => setTool(null)} />}{tool === "subtitles" && <InlineSubtitlePanel value={subtitleDraft} setValue={setSubtitleDraft} onAdd={addSubtitle} items={overlays.filter((o) => o.kind === "subtitle")} onDelete={deleteOverlay} onDone={() => setTool(null)} />}{tool === "models" && <ModelPanel onApply={applyModel} />}{tool === "autocut" && <div className="space-y-4"><p className="text-white/70 text-sm">AutoCut sélectionne automatiquement un passage court.</p><button onClick={applyAutoCut} className="w-full py-3 rounded-xl bg-red-500 font-bold">Appliquer AutoCut</button></div>}</div>}

      {showFilters && <div className="absolute inset-0 z-50 bg-black/95 p-4 overflow-y-auto"><div className="flex justify-between items-center mb-5"><h2 className="font-bold">Filtres</h2><button onClick={() => setShowFilters(false)}><X /></button></div><div className="flex gap-3 overflow-x-auto pb-4">{QUICK_FILTERS.map((filter) => <button key={filter.id} onClick={() => { setEditFilter(filter); setShowFilters(false); }} className="min-w-[70px] text-center"><div className="h-14 rounded-xl bg-white/10" style={{ filter: filter.cssFilter }} /><span className="text-[10px]">{filter.name}</span></button>)}</div><FilterLibrary onFilterSelect={(filter: Filter) => { setEditFilter({ id: filter.id, cssFilter: filter.cssFilter || "none" }); setShowFilters(false); }} selectedFilters={editFilter ? [editFilter.id] : []} onFilterRemove={() => setEditFilter(null)} /></div>}
      {showEffects && <div className="absolute inset-0 z-50 bg-black/95 p-4 overflow-y-auto"><div className="flex justify-between items-center mb-5"><div><h2 className="font-bold">Effets</h2><p className="text-xs text-white/55 mt-1">L’effet choisi s’applique à l’aperçu et à la vidéo exportée.</p></div><button onClick={() => setShowEffects(false)} aria-label="Fermer les effets"><X /></button></div><div className="mb-4 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm"><span>{activeEffect ? `Actif : ${activeEffect}` : "Aucun effet actif"}</span>{activeEffect && <button onClick={() => setActiveEffect(null)} className="text-red-300">Réinitialiser</button>}</div><EffectsLibrary onEffectSelect={(effect) => { setActiveEffect(effect.id); toast.success(`Effet « ${effect.name} » appliqué`); }} selectedEffects={activeEffect ? [activeEffect] : []} onEffectRemove={(effectId) => { if (effectId === activeEffect) setActiveEffect(null); }} /></div>}
      {showAudio && <AudioSelector onClose={() => setShowAudio(false)} onSelectAudio={(url, name) => { setSelectedMusic({ url, name }); setShowAudio(false); }} />}
      {selectedMusic && <audio ref={musicRef} src={selectedMusic.url} preload="auto" />}
      {showModifierEditor && preview && !isImage && <ClipEditorFixed src={preview} onAddClip={(newClip) => { setEditorClips((previous) => [...previous, newClip]); }} duration={duration} trimStart={trimStart} trimEnd={trimEnd || duration} cuts={cuts} onTrimChange={setTimelineTrim} onCutsChange={setCuts} onCurrentTimeChange={setTimelineTime} onClose={() => setShowModifierEditor(false)} />}
    </div>;
  }
  return <Publish />;
}

function waitForSeek(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; video.removeEventListener("seeked", finish); resolve(); };
    video.addEventListener("seeked", finish, { once: true });
    window.setTimeout(finish, 900);
  });
}
function isImageFile(file: File | null) { return !!file?.type.startsWith("image/"); }
function formatTime(value: number) { return `${Math.floor(Math.max(0, value) / 60).toString().padStart(2, "0")}:${Math.floor(Math.max(0, value) % 60).toString().padStart(2, "0")}`; }
function toolTitle(tool: Tool) { return ({ trim: "Découper la vidéo", text: "Texte", stickers: "Stickers", subtitles: "Sous-titres", models: "Modèles", autocut: "AutoCut" } as Record<string, string>)[tool || ""] || "Montage"; }
function ToolButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex flex-col items-center gap-1 shrink-0"><span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center">{icon}</span><span className="text-[11px] font-semibold">{label}</span></button>; }

function TrimPanel({ duration, start, end, current, cutStart, cutEnd, cuts, onCutStart, onCutEnd, onRemoveFront, onRemoveBack, onRemoveMiddle, onDeleteCut, onPreview }: { duration: number; start: number; end: number; current: number; cutStart: number; cutEnd: number; cuts: CutRange[]; onCutStart: (v: number) => void; onCutEnd: (v: number) => void; onRemoveFront: () => void; onRemoveBack: () => void; onRemoveMiddle: () => void; onDeleteCut: (index: number) => void; onPreview: () => void }) {
  return <div className="space-y-4"><div className="rounded-2xl bg-white/5 p-3 flex justify-between text-xs"><span>Position</span><strong>{formatTime(current)} / {formatTime(duration)}</strong></div><div className="grid grid-cols-2 gap-2"><button onClick={onRemoveFront} className="rounded-xl bg-white/10 p-3 text-left"><b>Couper avant</b><div className="text-[10px] text-white/50">Enlève tout avant la position</div></button><button onClick={onRemoveBack} className="rounded-xl bg-white/10 p-3 text-left"><b>Couper après</b><div className="text-[10px] text-white/50">Enlève tout après la position</div></button></div><div className="rounded-2xl bg-white/5 p-3 space-y-3"><div className="flex justify-between text-xs"><span>Début à enlever</span><b>{formatTime(cutStart)}</b></div><input className="w-full" type="range" min={start} max={Math.max(start, end - 0.1)} step="0.1" value={Math.min(cutStart, end - 0.1)} onChange={(e) => onCutStart(Math.min(Number(e.target.value), cutEnd - 0.1))} /><div className="flex justify-between text-xs"><span>Fin à enlever</span><b>{formatTime(cutEnd)}</b></div><input className="w-full" type="range" min={Math.min(cutStart + 0.1, end)} max={end} step="0.1" value={Math.max(cutEnd, cutStart + 0.1)} onChange={(e) => onCutEnd(Math.max(Number(e.target.value), cutStart + 0.1))} /><button onClick={onRemoveMiddle} className="w-full py-3 rounded-xl bg-red-500 font-bold flex items-center justify-center gap-2"><Scissors size={17} /> Supprimer cette partie</button></div>{cuts.length > 0 && <div className="space-y-2"><div className="text-xs font-bold">Parties supprimées</div>{cuts.map((cut, index) => <div key={`${cut.start}-${cut.end}-${index}`} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span className="text-xs">{formatTime(cut.start)} → {formatTime(cut.end)}</span><button onClick={() => onDeleteCut(index)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Annuler cette coupe"><X size={15} /></button></div>)}</div>}<button onClick={onPreview} className="w-full py-3 rounded-xl bg-white/10 font-bold">Voir le résultat en lecture</button></div>;
}
function InlineTextPanel({ value, setValue, size, setSize, color, setColor, onAdd, items, onDelete, onDone }: { value: string; setValue: (v: string) => void; size: number; setSize: (v: number) => void; color: string; setColor: (v: string) => void; onAdd: () => void; items: Overlay[]; onDelete: (id: string) => void; onDone: () => void }) { return <div className="space-y-3"><div className="flex min-w-0 w-full max-w-full gap-2"><input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Tape ici — le texte s'affiche au centre" style={{ fontSize: 16, WebkitTextSizeAdjust: "100%", touchAction: "manipulation" }} className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none text-white/70" /><button onClick={onAdd} className="px-4 rounded-xl bg-red-500 font-bold">Ajouter</button></div><div className="flex items-center gap-4"><div className="flex-1"><div className="flex justify-between text-xs text-white/60"><span>Taille</span><span>{size}px</span></div><input type="range" min="16" max="72" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" /></div><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 bg-transparent" aria-label="Couleur du texte" /></div><p className="text-xs text-white/50">Le texte apparaît sur la vidéo et se déplace avec le doigt.</p><div className="flex flex-wrap gap-2">{items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><span className="max-w-40 truncate text-sm">{item.text}</span><button onClick={() => onDelete(item.id)} aria-label="Supprimer"><Trash2 size={14} /></button></div>)}</div><button onClick={onDone} className="w-full py-2.5 rounded-xl bg-white/10 font-semibold">Terminer</button></div>; }
function InlineStickerPanel({ onAdd, items, onDelete, onDone }: { onAdd: (v: string) => void; items: Overlay[]; onDelete: (id: string) => void; onDone: () => void }) { return <div className="space-y-3"><p className="text-xs text-white/50">Choisis un sticker, puis déplace-le directement sur la vidéo.</p><div className="grid grid-cols-6 gap-2">{STICKERS.map((sticker) => <button key={sticker} onClick={() => onAdd(sticker)} className="text-2xl rounded-xl bg-white/10 py-2.5">{sticker}</button>)}</div><div className="flex flex-wrap gap-2">{items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><span className="text-xl">{item.text}</span><button onClick={() => onDelete(item.id)} aria-label="Supprimer"><Trash2 size={14} /></button></div>)}</div><button onClick={onDone} className="w-full py-2.5 rounded-xl bg-white/10 font-semibold">Terminer</button></div>; }
function InlineSubtitlePanel({ value, setValue, onAdd, items, onDelete, onDone }: { value: string; setValue: (v: string) => void; onAdd: () => void; items: Overlay[]; onDelete: (id: string) => void; onDone: () => void }) { return <div className="space-y-3"><div className="flex min-w-0 w-full max-w-full gap-2"><input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Écris un sous-titre..." className="min-w-0 w-0 flex-1 text-base rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none" style={{ fontSize: 16 }} /><button onClick={onAdd} className="px-4 rounded-xl bg-red-500 font-bold">Ajouter</button></div><p className="text-xs text-white/50">Le sous-titre est placé au moment actuel.</p><div className="flex flex-wrap gap-2">{items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><span className="max-w-40 truncate text-sm">{item.text}</span><button onClick={() => onDelete(item.id)} aria-label="Supprimer"><Trash2 size={14} /></button></div>)}</div><button onClick={onDone} className="w-full py-2.5 rounded-xl bg-white/10 font-semibold">Terminer</button></div>; }
function ModelPanel({ onApply }: { onApply: (name: string) => void }) { return <div className="grid gap-3">{["Rapide", "Focus", "Complet"].map((name) => <button key={name} onClick={() => onApply(name)} className="rounded-xl bg-white/10 p-4 text-left"><div className="font-bold">{name}</div><div className="text-xs text-white/60 mt-1">{name === "Rapide" ? "Premières 15 secondes" : name === "Focus" ? "10 secondes autour du milieu" : "Toute la vidéo"}</div></button>)}</div>; }
