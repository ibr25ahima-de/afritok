import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter"; // 👈 AJOUTÉ useRoute
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc"; // 👈 AJOUTÉ trpc
import { CameraRecorder } from "@/components/CameraRecorder";
import Publish from "./Publish";
import AudioSelector from "@/components/AudioSelector.tsx";
import { FilterLibrary, Filter } from "@/components/FilterLibrary";
import { EffectsLibrary, Effect } from "@/components/EffectsLibrary";
import { useUpload } from "@/contexts/UploadContext";
import { RefreshCw, Type, Music, Smile, MapPin, Users, X, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Step = "capture" | "edit" | "publish";

// Émojis/stickers pour le sélecteur
const EMOJI_STICKERS = [
  "❤️", "🔥", "💯", "😂", "🎉", "✨", "💪", "🌟", "😍", "🎵",
  "💋", "👑", "🦋", "🌈", "⚡", "💎", "🎭", "🌸", "🎈", "🎊",
  "😎", "🤩", "🥰", "💃", "🕺", "🎤", "🎧", "📸", "🌙", "☀️",
];

// Filtres rapides pour l'étape edit
const EDIT_FILTERS: { id: string; name: string; cssFilter: string }[] = [
  { id: 'none', name: 'Normal', cssFilter: 'none' },
  { id: 'beauty-smooth', name: 'Smooth', cssFilter: 'blur(0.5px) brightness(1.05)' },
  { id: 'beauty-glow', name: 'Glow', cssFilter: 'brightness(1.1) saturate(1.2)' },
  { id: 'color-vivid', name: 'Vivid', cssFilter: 'saturate(1.5) contrast(1.1)' },
  { id: 'color-warm', name: 'Warm', cssFilter: 'hue-rotate(-30deg) saturate(1.3)' },
  { id: 'color-cool', name: 'Cool', cssFilter: 'hue-rotate(180deg) saturate(1.2)' },
  { id: 'color-neon', name: 'Neon', cssFilter: 'saturate(2) contrast(1.3) brightness(1.1)' },
  { id: 'vintage-sepia', name: 'Sepia', cssFilter: 'sepia(0.8) saturate(1.2)' },
  { id: 'vintage-film', name: 'Film', cssFilter: 'contrast(1.2) saturate(0.8) brightness(0.95)' },
  { id: 'mood-cinematic', name: 'Cinéma', cssFilter: 'contrast(1.2) saturate(0.9) brightness(1.05)' },
  { id: 'mood-dramatic', name: 'Dramatic', cssFilter: 'contrast(1.4) brightness(0.9) saturate(1.1)' },
  { id: 'mood-dreamy', name: 'Dreamy', cssFilter: 'brightness(1.2) saturate(0.8) blur(0.3px)' },
  { id: 'special-bw', name: 'B&W', cssFilter: 'grayscale(1)' },
  { id: 'special-hdr', name: 'HDR', cssFilter: 'contrast(1.3) saturate(1.2) brightness(1.1)' },
];

// Overlay de texte sur la vidéo
interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
}

// Overlay de localisation
interface LocationOverlay {
  id: string;
  name: string;
  x: number;
  y: number;
}

// Overlay d'identification
interface TagOverlay {
  id: string;
  username: string;
  x: number;
  y: number;
}

export default function Upload() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/upload/:videoId"); // 👈 AJOUTÉ pour lire l'ID de la vidéo
  const { isAuthenticated, user } = useAuth();
  
  // Utilisation de la musique depuis le contexte UploadContext
  const { 
    file, 
    setFile, 
    preview, 
    setPreview, 
    selectedMusic, 
    setSelectedMusic 
  } = useUpload();
  
  const [step, setStep] = useState<Step>("capture");
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [showAudioSelector, setShowAudioSelector] = useState(false);

  // ✅ AUTO-LOAD MUSIC (TikTok style)
  const videoId = params?.videoId ? parseInt(params.videoId) : null;
  const { data: audioVideo } = trpc.video.getById.useQuery(
    { id: videoId! },
    { enabled: !!videoId }
  );

  useEffect(() => {
    if (audioVideo && audioVideo.videoUrl) {
      setSelectedMusic({
        url: audioVideo.videoUrl, // On utilise le son de la vidéo
        name: `Son original - ${audioVideo.user?.name || "Artiste"}`,
      });
      toast.success("Son chargé automatiquement !");
    }
  }, [audioVideo, setSelectedMusic]);

  // States pour l'étape edit
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [showStickerSelector, setShowStickerSelector] = useState(false);
  const [showEditFilters, setShowEditFilters] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showFilterLibrary, setShowFilterLibrary] = useState(false);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);

  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [newText, setNewText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFontSize, setTextFontSize] = useState(24);
  const [textFontFamily, setTextFontFamily] = useState("sans-serif");

  // Stickers
  const [stickers, setStickers] = useState<{ id: string; emoji: string; x: number; y: number; size: number }[]>([]);

  // Filters appliqués en edit
  const [editFilter, setEditFilter] = useState<{ id: string; cssFilter: string } | null>(null);

  // Location
  const [locations, setLocations] = useState<LocationOverlay[]>([]);
  const [newLocation, setNewLocation] = useState("");

  // Tags
  const [tags, setTags] = useState<TagOverlay[]>([]);
  const [newTag, setNewTag] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, setPreview]);

  useEffect(() => {
    if (step !== "edit") return;
    
    const video = videoRef.current;
    const audio = musicRef.current;

    if (!video || !audio) return;

    const play = () => {
      audio.currentTime = video.currentTime;
      audio.play().catch(() => {});
    };

    const pause = () => {
      audio.pause();
    };

    const seek = () => {
      audio.currentTime = video.currentTime;
    };

    const ended = () => {
      audio.pause();
      audio.currentTime = 0;
    };

    video.addEventListener("play", play);
    video.addEventListener("pause", pause);
    video.addEventListener("seeked", seek);
    video.addEventListener("ended", ended);

    if (!video.paused) play();

    return () => {
      video.removeEventListener("play", play);
      video.removeEventListener("pause", pause);
      video.removeEventListener("seeked", seek);
      video.removeEventListener("ended", ended);
    };
  }, [step, selectedMusic, preview]);

  // Ajouter un texte overlay
  const handleAddText = () => {
    if (!newText.trim()) {
      toast.error("Entrez du texte");
      return;
    }
    const overlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: newText,
      x: 50,
      y: 50,
      color: textColor,
      fontSize: textFontSize,
      fontFamily: textFontFamily,
    };
    setTextOverlays(prev => [...prev, overlay]);
    setNewText("");
    setShowTextOverlay(false);
    toast.success("Texte ajouté");
  };

  // Supprimer un texte overlay
  const handleRemoveText = (id: string) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
  };

  // Ajouter un sticker
  const handleAddSticker = (emoji: string) => {
    const sticker = {
      id: `sticker-${Date.now()}`,
      emoji,
      x: 50,
      y: 50,
      size: 48,
    };
    setStickers(prev => [...prev, sticker]);
    setShowStickerSelector(false);
    toast.success("Sticker ajouté");
  };

  // Supprimer un sticker
  const handleRemoveSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  // Ajouter un filtre en edit
  const handleEditFilterSelect = (filter: Filter) => {
    setEditFilter({ id: filter.id, cssFilter: filter.cssFilter || 'none' });
    toast.info(`Filtre "${filter.name}" appliqué`);
  };

  // Ajouter une localisation
  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast.error("Entrez un lieu");
      return;
    }
    const loc: LocationOverlay = {
      id: `loc-${Date.now()}`,
      name: newLocation,
      x: 20,
      y: 90,
    };
    setLocations(prev => [...prev, loc]);
    setNewLocation("");
    setShowLocationPicker(false);
    toast.success("Lieu ajouté");
  };

  // Supprimer une localisation
  const handleRemoveLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  // Ajouter un tag
  const handleAddTag = () => {
    if (!newTag.trim()) {
      toast.error("Entrez un nom d'utilisateur");
      return;
    }
    const tag: TagOverlay = {
      id: `tag-${Date.now()}`,
      username: newTag.startsWith('@') ? newTag : `@${newTag}`,
      x: 20,
      y: 85,
    };
    setTags(prev => [...prev, tag]);
    setNewTag("");
    setShowTagPicker(false);
    toast.success("Identification ajoutée");
  };

  // Supprimer un tag
  const handleRemoveTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  if (!isAuthenticated) return <div className="h-screen bg-black flex items-center justify-center text-white">Connexion requise</div>;

  // --- ÉTAPE 1: CAPTURE ---
  if (step === "capture") {
    return (
      <>
        <CameraRecorder 
          onVideoRecorded={(blob, duration) => {
            const recordedFile = new File([blob], "video.webm", { type: "video/webm" });
            setFile(recordedFile);
            setRecordedDuration(duration);
            setStep("edit");
          }}
          onPhotoTaken={(blob) => {
            const photoFile = new File([blob], "photo.jpg", { type: "image/jpeg" });
            setFile(photoFile);
            setStep("edit");
          }}
          onClose={() => navigate("/feed")}
          onOpenMusic={() => setShowAudioSelector(true)}
          onOpenEffects={() => {
            toast.info("Sélectionnez un effet dans le panneau Filtrer");
          }}
          onPublish={() => {
            setStep("publish");
          }}
          selectedMusic={selectedMusic}
        />

        {showAudioSelector && (
          <AudioSelector
            onClose={() => setShowAudioSelector(false)}
            onSelectAudio={(url, name) => {
              setSelectedMusic({
                url,
                name,
              });
              setShowAudioSelector(false);
            }}
          />
        )}
      </>
    );
  }

  // --- ÉTAPE 2: MODIFICATION ---
  if (step === "edit") {
    return (
      <div className="h-screen bg-black text-white relative flex flex-col overflow-hidden">
        <div ref={previewContainerRef} className="absolute inset-0">
          {file?.type.startsWith("image/") ? (
            <img 
              src={preview!} 
              className="w-full h-full object-cover" 
              alt="preview"
              style={{ filter: editFilter?.cssFilter || 'none' }}
            />
          ) : (
            <video 
              ref={videoRef}
              src={preview!} 
              autoPlay 
              loop 
              muted 
              className="w-full h-full object-cover" 
              style={{ filter: editFilter?.cssFilter || 'none' }}
            />
          )}
          {selectedMusic && (
            <audio
              ref={musicRef}
              src={selectedMusic.url}
              preload="auto"
            />
          )}
        </div>

        {/* TEXT OVERLAYS */}
        {textOverlays.map(overlay => (
          <div
            key={overlay.id}
            className="absolute z-25 cursor-move"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative group">
              <p
                style={{
                  color: overlay.color,
                  fontSize: `${overlay.fontSize}px`,
                  fontFamily: overlay.fontFamily,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              >
                {overlay.text}
              </p>
              <button
                onClick={() => handleRemoveText(overlay.id)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* STICKERS */}
        {stickers.map(sticker => (
          <div
            key={sticker.id}
            className="absolute z-25 cursor-move"
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${sticker.size}px`,
            }}
          >
            <div className="relative group">
              <span>{sticker.emoji}</span>
              <button
                onClick={() => handleRemoveSticker(sticker.id)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* LOCATION OVERLAYS */}
        {locations.map(loc => (
          <div
            key={loc.id}
            className="absolute z-25"
            style={{
              left: `${loc.x}%`,
              top: `${loc.y}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="relative group bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <MapPin size={12} className="text-white/80" />
              <span className="text-xs font-medium text-white">{loc.name}</span>
              <button
                onClick={() => handleRemoveLocation(loc.id)}
                className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}

        {/* TAG OVERLAYS */}
        {tags.map(tag => (
          <div
            key={tag.id}
            className="absolute z-25"
            style={{
              left: `${tag.x}%`,
              top: `${tag.y}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="relative group bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Users size={12} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-300">{tag.username}</span>
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
        
        {/* Barre latérale droite */}
        <div className="absolute right-4 top-16 flex flex-col gap-5 z-20 items-center">
          <button onClick={() => setShowTextOverlay(true)} className="flex flex-col items-center gap-1 group">
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Type size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Texte</span>
          </button>

          <button onClick={() => setShowStickerSelector(true)} className="flex flex-col items-center gap-1 group">
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Smile size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Stickers</span>
          </button>

          <button onClick={() => setShowEditFilters(true)} className="flex flex-col items-center gap-1 group">
            <div className={`p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg ${editFilter ? 'border-yellow-400/50' : ''}`}>
              <RefreshCw size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Effets</span>
          </button>

          <button onClick={() => setShowAudioSelector(true)} className="flex flex-col items-center gap-1 group">
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Music size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Audio</span>
          </button>
        </div>

        <div className="mt-auto p-4 pb-10 z-20 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-4 mb-6 justify-center">
            <button onClick={() => setShowLocationPicker(true)} className="flex items-center gap-2 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-sm active:scale-95 transition-all">
              <MapPin size={14}/> 
              <span>Lieu</span>
              {locations.length > 0 && <span className="w-4 h-4 bg-yellow-400 rounded-full text-[10px] font-bold text-black flex items-center justify-center">{locations.length}</span>}
            </button>

            <button onClick={() => setShowTagPicker(true)} className="flex items-center gap-2 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-sm active:scale-95 transition-all">
              <Users size={14}/> 
              <span>Identifier</span>
              {tags.length > 0 && <span className="w-4 h-4 bg-blue-400 rounded-full text-[10px] font-bold text-black flex items-center justify-center">{tags.length}</span>}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setFile(null); setStep("capture"); }} className="flex-1 bg-white/10 backdrop-blur-md py-3.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 overflow-hidden border border-white/20 shadow-sm">
                <img src={user?.image || ""} alt="" className="w-full h-full object-cover"/>
              </div>
              <span className="text-sm">Ta Story</span>
            </button>
            <button onClick={() => { if (file) setFile(file); if (preview) setPreview(preview); setStep("publish"); }} className="flex-1 bg-red-500 py-3.5 rounded-full font-bold text-white active:scale-95 transition-all shadow-lg shadow-red-500/30 text-sm">
              Suivant
            </button>
          </div>
        </div>

        {/* PANNEAUX OVERLAY (Filtres, Effets, etc.) */}
        {showEditFilters && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end">
            <div className="w-full bg-zinc-900 rounded-t-3xl p-6 pb-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Filtres</h3>
                <button onClick={() => setShowEditFilters(false)} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-4 gap-4 overflow-y-auto max-h-[40vh]">
                {EDIT_FILTERS.map(f => (
                  <button key={f.id} onClick={() => handleEditFilterSelect(f as any)} className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-xl bg-gray-800 border-2 border-transparent hover:border-yellow-400 overflow-hidden" style={{ filter: f.cssFilter }}>
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-50"></div>
                    </div>
                    <span className="text-[10px] font-medium">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ÉTAPE 3: PUBLICATION ---
  if (step === "publish") {
    return <Publish videoFile={file!} onBack={() => setStep("edit")} />;
  }

  return null;
}
