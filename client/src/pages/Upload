import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
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
            // Ouvrir le panneau d'effets depuis CameraRecorder
            toast.info("Sélectionnez un effet dans le panneau Filtrer");
          }}
          onPublish={() => {
            // Naviguer directement vers l'étape publish
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
        
        {/* Barre latérale droite — Style harmonisé avec CameraRecorder */}
        <div className="absolute right-4 top-16 flex flex-col gap-5 z-20 items-center">
          {/* TEXTE */}
          <button 
            onClick={() => setShowTextOverlay(true)} 
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Type size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Texte</span>
          </button>

          {/* STICKERS */}
          <button 
            onClick={() => setShowStickerSelector(true)} 
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Smile size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Stickers</span>
          </button>

          {/* EFFETS (filtres) */}
          <button 
            onClick={() => setShowEditFilters(true)} 
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg ${editFilter ? 'border-yellow-400/50' : ''}`}>
              <RefreshCw size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Effets</span>
          </button>

          {/* AUDIO */}
          <button onClick={() => setShowAudioSelector(true)} className="flex flex-col items-center gap-1 group">
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Music size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Audio</span>
          </button>
        </div>

        <div className="mt-auto p-4 pb-10 z-20 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-4 mb-6 justify-center">
            {/* LIEU */}
            <button 
              onClick={() => setShowLocationPicker(true)}
              className="flex items-center gap-2 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-sm active:scale-95 transition-all"
            >
              <MapPin size={14}/> 
              <span>Lieu</span>
              {locations.length > 0 && (
                <span className="w-4 h-4 bg-yellow-400 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                  {locations.length}
                </span>
              )}
            </button>

            {/* IDENTIFIER */}
            <button 
              onClick={() => setShowTagPicker(true)}
              className="flex items-center gap-2 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-sm active:scale-95 transition-all"
            >
              <Users size={14}/> 
              <span>Identifier</span>
              {tags.length > 0 && (
                <span className="w-4 h-4 bg-blue-400 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                  {tags.length}
                </span>
              )}
            </button>
          </div>

          {/* Infos sur les overlays actifs */}
          {(textOverlays.length > 0 || stickers.length > 0) && (
            <div className="flex gap-2 mb-4 justify-center flex-wrap">
              {textOverlays.length > 0 && (
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full">{textOverlays.length} texte(s)</span>
              )}
              {stickers.length > 0 && (
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full">{stickers.length} sticker(s)</span>
              )}
              {editFilter && (
                <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full">{editFilter.id}</span>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={() => { setFile(null); setStep("capture"); }} 
              className="flex-1 bg-white/10 backdrop-blur-md py-3.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/10"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 overflow-hidden border border-white/20 shadow-sm">
                <img src={user?.image || ""} alt="" className="w-full h-full object-cover"/>
              </div>
              <span className="text-sm">Ta Story</span>
            </button>
            <button 
              onClick={() => {
                if (file) setFile(file);
                if (preview) setPreview(preview);
                setStep("publish");
              }} 
              className="flex-1 bg-red-500 py-3.5 rounded-full font-bold text-white active:scale-95 transition-all shadow-lg shadow-red-500/30 text-sm"
            >
              Suivant
            </button>
          </div>
        </div>

        {/* --- PANNEAUX OVERLAY --- */}

        {/* SÉLECTEUR DE TEXTE */}
        {showTextOverlay && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Type size={16} /> Ajouter du texte
              </h3>
              <button onClick={() => setShowTextOverlay(false)} className="text-xs text-gray-400 flex items-center gap-1">
                <X size={14} /> Fermer
              </button>
            </div>

            {/* Texte déjà ajouté */}
            {textOverlays.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                {textOverlays.map(overlay => (
                  <div key={overlay.id} className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-full min-w-fit">
                    <span className="text-xs truncate max-w-[100px]">{overlay.text}</span>
                    <button onClick={() => handleRemoveText(overlay.id)} className="text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input texte */}
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Entrez votre texte..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-3"
            />

            {/* Couleur du texte */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-400">Couleur:</span>
              <div className="flex gap-2">
                {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800'].map(color => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${textColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Taille du texte */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-400">Taille:</span>
              <input
                type="range"
                min="12"
                max="72"
                value={textFontSize}
                onChange={(e) => setTextFontSize(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-400 w-8">{textFontSize}px</span>
            </div>

            {/* Police */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-400">Police:</span>
              <select
                value={textFontFamily}
                onChange={(e) => setTextFontFamily(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="sans-serif">Sans-serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="cursive">Cursive</option>
              </select>
            </div>

            <button
              onClick={handleAddText}
              className="w-full bg-red-500 py-3 rounded-full font-bold text-sm active:scale-95 transition-all"
            >
              Ajouter le texte
            </button>
          </div>
        )}

        {/* SÉLECTEUR DE STICKERS */}
        {showStickerSelector && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg rounded-t-2xl p-4 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Smile size={16} /> Stickers
              </h3>
              <button onClick={() => setShowStickerSelector(false)} className="text-xs text-gray-400 flex items-center gap-1">
                <X size={14} /> Fermer
              </button>
            </div>

            {/* Stickers déjà ajoutés */}
            {stickers.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                {stickers.map(sticker => (
                  <div key={sticker.id} className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-full">
                    <span className="text-lg">{sticker.emoji}</span>
                    <button onClick={() => handleRemoveSticker(sticker.id)} className="text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Grille d'émojis */}
            <div className="grid grid-cols-6 gap-3">
              {EMOJI_STICKERS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleAddSticker(emoji)}
                  className="text-3xl p-2 bg-white/5 rounded-xl hover:bg-white/10 active:scale-90 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SÉLECTEUR D'EFFETS/FILTRES EN EDIT */}
        {showEditFilters && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Palette size={16} /> Filtres & Effets
              </h3>
              <button onClick={() => setShowEditFilters(false)} className="text-xs text-gray-400 flex items-center gap-1">
                <X size={14} /> Fermer
              </button>
            </div>

            {/* Filtre actif */}
            {editFilter && (
              <div className="flex items-center gap-2 mb-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2">
                <Sparkles size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">Filtre actif: {editFilter.id}</span>
                <button
                  onClick={() => setEditFilter(null)}
                  className="ml-auto text-red-400"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Filtres rapides */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
              {EDIT_FILTERS.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => handleEditFilterSelect({ id: filter.id, cssFilter: filter.cssFilter, category: 'special' } as Filter)}
                  className={`flex flex-col items-center gap-1 min-w-[64px] ${
                    editFilter?.id === filter.id ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden border-2 transition-all"
                    style={{
                      filter: filter.cssFilter,
                      borderColor: editFilter?.id === filter.id ? '#facc15' : 'transparent',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  />
                  <span className="text-[10px] font-medium">{filter.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setShowEditFilters(false); setShowFilterLibrary(true); }}
              className="w-full mt-3 py-2 bg-white/10 rounded-full text-xs font-bold border border-white/10"
            >
              Voir tous les filtres (50+)
            </button>
          </div>
        )}

        {/* BIBLIOTHÈQUE DE FILTRES COMPLÈTE (edit) */}
        {showFilterLibrary && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-lg p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Tous les filtres</h3>
              <button onClick={() => setShowFilterLibrary(false)} className="text-xs text-gray-400 flex items-center gap-1">
                <X size={14} /> Fermer
              </button>
            </div>
            <FilterLibrary
              onFilterSelect={handleEditFilterSelect}
              selectedFilters={editFilter ? [editFilter.id] : []}
              onFilterRemove={() => setEditFilter(null)}
            />
          </div>
        )}

        {/* BIBLIOTHÈQUE D'EFFETS (edit) */}
        {showEffectsPanel && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-lg p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Effets</h3>
              <button onClick={() => setShowEffectsPanel(false)} className="text-xs text-gray-400 flex items-center gap-1">
                <X size={14} /> Fermer
              </button>
            </div>
            <EffectsLibrary
              onEffectSelect={(effect) => toast.info(`Effet "${effect.name}" appliqué`)}
              selectedEffects={[]}
              onEffectRemove={() => {}}
            />
          </div>
        )}

        {/* SÉLECTEUR DE LOCALISATION */}
        {showLocationPicker && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg rounded-t-2xl p-4 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MapPin size={16} /> Ajouter un lieu
              </h3>
              <button onClick={() => setShowLocationPicker(false)} className="text-xs text-gray-400 flex items-center gap-1">
                <X size={14} /> Fermer
              </button>
            </div>

            {/* Lieux déjà ajoutés */}
            {locations.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                {locations.map(loc => (
                  <div key={loc.id} className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-full">
                    <MapPin size={10} className="text-gray-400" />
                    <span className="text-xs">{loc.name}</span>
                    <button onClick={() => handleRemoveLocation(loc.id)} className="text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Rechercher un lieu..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-3"
            />

            {/* Suggestions populaires */}
            <div className="space-y-2 mb-4">
              {['Paris, France', 'Dakar, Sénégal', 'Abidjan, Côte d\'Ivoire', 'Kinshasa, RDC', 'Lagos, Nigeria', 'Casablanca, Maroc'].map(place => (
                <button
                  key={place}
                  onClick={() => { setNewLocation(place); }}
                  className="w-full flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 text-left hover:bg-white/10 transition-all"
                >
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-xs">{place}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleAddLocation}
              className="w-full bg-red-500 py-3 rounded-full font-bold text-sm active:scale-95 transition-all"
            >
              Ajouter le lieu
            </button>
          </div>
        )}

        {/* SÉLECTEUR D'IDENTIFICATION */}
        {showTagPicker && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg rounded-t-2xl p-4 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users size={16} /> Identifier quelqu'un
              </h3>
              <button onClick={() => setShowTagPicker(false)} className="text-xs text-gray-400 flex items-center gap-1">
                <X size={14} /> Fermer
              </button>
            </div>

            {/* Tags déjà ajoutés */}
            {tags.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center gap-1 bg-blue-400/10 px-3 py-2 rounded-full">
                    <Users size={10} className="text-blue-400" />
                    <span className="text-xs text-blue-300">{tag.username}</span>
                    <button onClick={() => handleRemoveTag(tag.id)} className="text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="@nom_utilisateur..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 mb-3"
            />

            <button
              onClick={handleAddTag}
              className="w-full bg-red-500 py-3 rounded-full font-bold text-sm active:scale-95 transition-all"
            >
              Identifier
            </button>
          </div>
        )}

        {showAudioSelector && (
          <AudioSelector
            onClose={() => setShowAudioSelector(false)}
            onSelectAudio={(url, name) => {
              setSelectedMusic({ url, name });
              setShowAudioSelector(false);
            }}
          />
        )}
      </div>
    );
  }

  // --- ÉTAPE 3: PUBLICATION ---
  return <Publish />;
}
