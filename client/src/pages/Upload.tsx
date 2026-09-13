import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CameraRecorder } from "@/components/CameraRecorder";
import Publish from "./Publish";
import AudioSelector from "@/components/AudioSelector.tsx";
import { FilterLibrary, Filter } from "@/components/FilterLibrary";
import { EffectsLibrary } from "@/components/EffectsLibrary";
import { useUpload } from "@/contexts/UploadContext";
import { ArrowLeft, ChevronDown, Film, Music, Pause, Play, RotateCcw, Sparkles, Type, Volume2, X } from "lucide-react";
import { toast } from "sonner";

type Step = "capture" | "edit" | "publish";

const QUICK_FILTERS: { id: string; name: string; cssFilter: string }[] = [
  { id: "none", name: "Normal", cssFilter: "none" },
  { id: "smooth", name: "Smooth", cssFilter: "brightness(1.05) blur(.5px)" },
  { id: "vivid", name: "Vivid", cssFilter: "saturate(1.45) contrast(1.08)" },
  { id: "warm", name: "Warm", cssFilter: "sepia(.18) saturate(1.2)" },
  { id: "cinema", name: "Cinéma", cssFilter: "contrast(1.18) saturate(.9)" },
];

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { file, setFile, preview, setPreview, selectedMusic, setSelectedMusic } = useUpload();
  const [step, setStep] = useState<Step>("capture");
  const [showAudio, setShowAudio] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [editFilter, setEditFilter] = useState<{ id: string; cssFilter: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, setPreview]);

  useEffect(() => {
    if (step !== "edit" || !videoRef.current) return;
    const video = videoRef.current;
    const onTime = () => {
      setProgress(video.duration ? video.currentTime / video.duration : 0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [step, preview]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      musicRef.current?.play().catch(() => {});
    } else {
      video.pause();
      musicRef.current?.pause();
    }
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
    video.currentTime = 0;
    setProgress(0);
    video.play().catch(() => {});
  };

  if (!isAuthenticated) {
    return <div className="h-screen bg-black flex items-center justify-center text-white">Connexion requise</div>;
  }

  if (step === "capture") {
    return (
      <>
        <CameraRecorder
          onVideoRecorded={(blob, recordedDuration) => {
            if (blob.size < 1024) {
              toast.error("La vidéo enregistrée est vide. Réessaie.");
              return;
            }
            const recordedFile = new File([blob], "video.webm", { type: blob.type || "video/webm" });
            setFile(recordedFile);
            setPreview(URL.createObjectURL(recordedFile));
            setStep("edit");
            toast.success(`Vidéo prête pour le montage · ${recordedDuration}s`);
          }}
          onPhotoTaken={(blob) => {
            const photoFile = new File([blob], "photo.jpg", { type: "image/jpeg" });
            setFile(photoFile);
            setPreview(URL.createObjectURL(photoFile));
            setStep("edit");
          }}
          onClose={() => navigate("/feed")}
          onOpenMusic={() => setShowAudio(true)}
          selectedMusic={selectedMusic}
        />
        {showAudio && (
          <AudioSelector
            onClose={() => setShowAudio(false)}
            onSelectAudio={(url, name) => {
              setSelectedMusic({ url, name });
              setShowAudio(false);
            }}
          />
        )}
      </>
    );
  }

  if (step === "edit") {
    const isImage = file?.type.startsWith("image/");
    return (
      <div className="h-screen bg-black text-white overflow-hidden relative">
        {/* Preview vidéo/photo */}
        <div className="absolute inset-x-0 top-0 bottom-[108px] flex items-center justify-center bg-black">
          {isImage ? (
            <img src={preview || ""} alt="Aperçu" className="w-full h-full object-cover" style={{ filter: editFilter?.cssFilter || "none" }} />
          ) : (
            <video
              ref={videoRef}
              src={preview || ""}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ filter: editFilter?.cssFilter || "none" }}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onEnded={() => { setIsPlaying(false); setProgress(1); }}
              onClick={togglePlayback}
            />
          )}

          {/* En-tête façon montage TikTok */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent">
            <button onClick={() => setStep("capture")} className="p-2 rounded-full bg-black/35" aria-label="Retour">
              <ArrowLeft size={25} />
            </button>
            <button onClick={() => setShowAudio(true)} className="rounded-full bg-black/50 px-5 py-2.5 text-sm font-bold flex items-center gap-2 max-w-[55%] truncate">
              <Music size={17} />
              <span className="truncate">{selectedMusic?.name || "Ajouter un son"}</span>
            </button>
            <button onClick={resetMontagePlayback} className="p-2 rounded-full bg-black/35" aria-label="Recommencer">
              <RotateCcw size={22} />
            </button>
          </div>

          {/* Commande lecture centrale */}
          {!isImage && !isPlaying && (
            <button onClick={togglePlayback} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-black/55 backdrop-blur flex items-center justify-center" aria-label="Lire">
              <Play size={30} fill="white" />
            </button>
          )}

          {/* Outils de montage : on laisse effets/filtres à part */}
          <div className="absolute right-3 top-20 bottom-24 flex flex-col justify-center gap-4">
            <button onClick={() => toast.info("Modifier sera ajouté dans l'étape suivante.")} className="flex flex-col items-center gap-1">
              <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"><Film size={22} /></span>
              <span className="text-[11px] font-semibold">Modifier</span>
            </button>
            <button onClick={() => toast.info("Les modèles seront ajoutés ensuite.")} className="flex flex-col items-center gap-1">
              <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"><Film size={22} /></span>
              <span className="text-[11px] font-semibold">Modèles</span>
            </button>
            <button onClick={() => toast.info("Le texte sera ajouté dans la prochaine étape.")} className="flex flex-col items-center gap-1">
              <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"><Type size={22} /></span>
              <span className="text-[11px] font-semibold">Texte</span>
            </button>
            <button onClick={() => setShowEffects(true)} className="flex flex-col items-center gap-1">
              <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"><Sparkles size={22} /></span>
              <span className="text-[11px] font-semibold">Effets</span>
            </button>
            <button onClick={() => setShowFilters(true)} className="flex flex-col items-center gap-1">
              <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"><Sparkles size={22} /></span>
              <span className="text-[11px] font-semibold">Filtres</span>
            </button>
            <button onClick={() => toast.info("Effet vocal sera ajouté ensuite.")} className="flex flex-col items-center gap-1">
              <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"><Volume2 size={22} /></span>
              <span className="text-[11px] font-semibold">Voix</span>
            </button>
          </div>

          {/* Timeline de montage */}
          {!isImage && (
            <div className="absolute left-4 right-4 bottom-5">
              <div className="flex items-center gap-3">
                <button onClick={togglePlayback} className="h-9 w-9 rounded-full bg-black/55 flex items-center justify-center" aria-label={isPlaying ? "Pause" : "Lecture"}>
                  {isPlaying ? <Pause size={17} /> : <Play size={17} fill="white" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={progress}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                  aria-label="Position dans la vidéo"
                />
                <span className="text-[11px] tabular-nums bg-black/45 px-2 py-1 rounded-full">{Math.floor((progress * duration) / 60).toString().padStart(2, "0")}:{Math.floor(progress * duration % 60).toString().padStart(2, "0")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Barre inférieure */}
        <div className="absolute bottom-0 left-0 right-0 h-[108px] bg-black px-4 py-3 z-20">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setShowAudio(true)} className="text-xs flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-full"><Music size={14} /> Son</button>
            <span className="text-[11px] text-white/60">Montage prêt</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/feed")} className="flex-1 py-3 rounded-full bg-white/10 font-bold text-sm">Annuler</button>
            <button onClick={() => setStep("publish")} className="flex-1 py-3 rounded-full bg-red-500 font-bold text-sm">Suivant</button>
          </div>
        </div>

        {/* Panneau filtres : logique existante conservée */}
        {showFilters && (
          <div className="absolute inset-0 z-50 bg-black/95 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold">Filtres</h2>
              <button onClick={() => setShowFilters(false)}><X /></button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {QUICK_FILTERS.map((filter) => (
                <button key={filter.id} onClick={() => { setEditFilter(filter); setShowFilters(false); }} className="min-w-[70px] text-center">
                  <div className="h-14 rounded-xl bg-white/10 border border-white/10" style={{ filter: filter.cssFilter }} />
                  <span className="text-[10px]">{filter.name}</span>
                </button>
              ))}
            </div>
            <FilterLibrary
              onFilterSelect={(filter: Filter) => { setEditFilter({ id: filter.id, cssFilter: filter.cssFilter || "none" }); setShowFilters(false); }}
              selectedFilters={editFilter ? [editFilter.id] : []}
              onFilterRemove={() => setEditFilter(null)}
            />
          </div>
        )}

        {/* Panneau effets : bibliothèque existante conservée */}
        {showEffects && (
          <div className="absolute inset-0 z-50 bg-black/95 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold">Effets</h2>
              <button onClick={() => setShowEffects(false)}><X /></button>
            </div>
            <EffectsLibrary
              onEffectSelect={(effect) => toast.info(`Effet "${effect.name}" appliqué`)}
              selectedEffects={[]}
              onEffectRemove={() => {}}
            />
          </div>
        )}

        {showAudio && (
          <AudioSelector
            onClose={() => setShowAudio(false)}
            onSelectAudio={(url, name) => {
              setSelectedMusic({ url, name });
              setShowAudio(false);
            }}
          />
        )}
        {selectedMusic && <audio ref={musicRef} src={selectedMusic.url} preload="auto" />}
      </div>
    );
  }

  return <Publish />;
}
