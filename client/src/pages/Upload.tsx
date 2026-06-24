import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, CheckCircle, X, Music, RotateCw, Zap, Timer, 
  LayoutGrid, UserPlus, Smile, ChevronDown, Image as ImageIcon,
  Scissors, Type, Sticker, Volume2, Sparkles, ArrowLeft, Check,
  Wand2, Play, Pause, ZapOff, Layout
} from "lucide-react";
import { toast } from "sonner";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// --- CONFIGURATION ---
const FILTERS = [
  { id: "normal", name: "Normal" },
  { id: "vibe", name: "Vibe" },
  { id: "warm", name: "Warm" },
  { id: "cold", name: "Cold" },
  { id: "cinema", name: "Cinéma" },
  { id: "retro", name: "Retro" },
  { id: "dream", name: "Dream" },
  { id: "summer", name: "Summer" },
  { id: "food", name: "Food" },
  { id: "portrait", name: "Portrait" },
  { id: "night", name: "Night" },
  { id: "bw", name: "N&B" }
];

const EFFECTS = [
  { id: "none", name: "Aucun" },
  { id: "beauty", name: "Beauté Pro" },
  { id: "bigeyes", name: "Grands Yeux" },
  { id: "faceslim", name: "Visage Fin" },
  { id: "lips", name: "Lèvres" },
  { id: "mirror", name: "Miroir" },
  { id: "facezoom", name: "Zoom Visage" },
  { id: "vhs", name: "VHS" }
];

const MUSICS = [
  { id: 1, name: "Afrobeat Mix", artist: "Burna", duration: 15, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, name: "TikTok Viral", artist: "Unknown", duration: 30, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, name: "Chill Night", artist: "Lofi", duration: 60, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

type Step = "capture" | "edit" | "publish";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const faceLandmarkerRef = useRef<any>(null);
  // State Flux
  const [step, setStep] = useState<Step>("capture");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // State Capture Options
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedDuration, setSelectedDuration] = useState("15 s");
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [activeEffect, setActiveEffect] = useState(EFFECTS[0]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  
  // New States (Step 1 & 4)
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(3);
  const [layoutMode, setLayoutMode] = useState(false);
  const [skinSmooth, setSkinSmooth] = useState(50);
  const [faceBright, setFaceBright] = useState(50);
  const [faceSharp, setFaceSharp] = useState(50);
  const [faceSlim, setFaceSlim] = useState(50);
  const [bigEyes, setBigEyes] = useState(50);
const [lipSize, setLipSize] = useState(50);
  // UI Drawers
  const [activeDrawer, setActiveDrawer] = useState<"none" | "music" | "filters" | "effects" | "beauty">("none");

  // State Media
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [overlayTexts, setOverlayTexts] = useState<{id: number, text: string}[]>([]);
  const [isAddingText, setIsAddingText] = useState(false);
  const [tempText, setTempText] = useState("");

  // State Publication
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Caméra bloquée ou inaccessible");
    }
  }, [facingMode]);

  useEffect(() => {
  if (step === "capture") {
    startCamera();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }
}, [step, facingMode, startCamera]);

  // --- HANDLERS ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStep("edit");
    }
  };

  const handleCaptureBtn = () => {
    if (selectedDuration === "Photo") {
      capturePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startCountdown();
      }
    }
  };

  const startCountdown = () => {
    let count = timerDuration;
    setCountdown(count);
    const timer = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(timer);
        setCountdown(null);
        startRecording();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const startRecording = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) return;
    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setFile(new File([blob], `vid-${Date.now()}.webm`, { type: "video/webm" }));
      setStep("edit");
    };

    mediaRecorder.start();
    setIsRecording(true);
    
    const duration = parseInt(selectedDuration) || 15;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.1;
      setRecordingProgress((elapsed / duration) * 100);
      if (elapsed >= duration || !mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        clearInterval(interval);
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }
    }, 100);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingProgress(0);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.filter = getComputedStyle(video).filter;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setFile(new File([blob], `img-${Date.now()}.jpg`, { type: "image/jpeg" }));
            setStep("edit");
          }
        }, "image/jpeg");
      }
    }
  };

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handlePublish = async () => {
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", String(user.id));
      const res = await fetch("/api/upload-video", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      await uploadMutation.mutateAsync({ 
        title: description.slice(0, 30) || "Nouveau post", 
        videoUrl: data.videoUrl 
      });
      setUploadSuccess(true);
      setTimeout(() => navigate("/feed"), 2000);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la publication");
    } finally {
      setIsLoading(false);
    }
  };

  const getCameraFilter = () => {
    // Combine multiple beauty states (skinSmooth, faceBright, faceSharp, faceSlim)
    let filter = `brightness(${100 + faceBright * 0.2}%) contrast(${100 + skinSmooth * 0.1}%) saturate(${100 + faceSharp * 0.15}%)`;
    
    // Add specific filters
    if (activeFilter.id === "bw") filter += " grayscale(100%)";
    if (activeFilter.id === "retro") filter += " sepia(30%) contrast(110%)";
    if (activeFilter.id === "warm") filter += " sepia(20%) saturate(140%)";
    if (activeFilter.id === "cold") filter += " hue-rotate(180deg) saturate(120%)";
    
    // Add effects
    if (activeEffect.id === "vhs") {
  filter += " sepia(40%) contrast(1.4) saturate(0.8) hue-rotate(20deg)";
    }
    if (activeEffect.id === "portrait") {
  filter += " contrast(1.3) saturate(1.25) brightness(105%)";
    }
    if (activeEffect.id === "beauty") {
  filter += " blur(0.5px) brightness(110%) saturate(120%)";
}
    return filter;
  };

  const getCameraTransform = () => {
    let transform = "";
    if (activeEffect.id === "facezoom") transform += " scale(1.5)";
    if (activeEffect.id === "mirror") transform += " scaleX(-1)";
    if (faceSlim > 50) transform += ` scaleX(${1 - (faceSlim - 50) * 0.002})`;
    return transform;
  };

  // --- UI COMPONENTS ---
  const Drawer = ({ title, children, onClose }: any) => (
    <div className="absolute inset-x-0 bottom-0 z-50 bg-neutral-900/95 backdrop-blur-xl rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="p-1 bg-white/10 rounded-full"><X size={20}/></button>
      </div>
      {children}
    </div>
  );

  if (uploadSuccess) return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
      <CheckCircle size={80} className="text-green-500 mb-4 animate-bounce" />
      <h2 className="text-2xl font-bold">Publié avec succès !</h2>
    </div>
  );

  // --- STEP 1: CAPTURE ---
  if (step === "capture") return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
     {layoutMode ? (
  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ filter: getCameraFilter(), transform: getCameraTransform() }}
      className="w-full h-full object-cover"
    />
    <div className="border border-white/20" />
    <div className="border border-white/20" />
    <div className="border border-white/20" />
  </div>
) : (
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    style={{ filter: getCameraFilter(), transform: getCameraTransform() }}
    className="absolute inset-0 w-full h-full object-cover transition-all"
  />
)} 
      {flashEnabled && <div className="absolute inset-0 bg-white/20 pointer-events-none z-0" />}
      <>
  <canvas ref={canvasRef} className="hidden" />

  <canvas
    ref={faceCanvasRef}
    className="absolute inset-0 w-full h-full pointer-events-none z-20"
  />
</>
      <audio ref={audioRef} className="hidden" />
      <input
  type="file"
  accept="audio/*"
  ref={audioInputRef}
  className="hidden"
  onChange={(e) => {
    const audio = e.target.files?.[0];
    if (!audio) return;

    const url = URL.createObjectURL(audio);

    setSelectedMusic({
      id: Date.now(),
      name: audio.name,
      artist: "Local",
      url,
    });

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  }}
/>
      
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/20 z-50">
          <div className="h-full bg-yellow-400 transition-all duration-100" style={{ width: `${recordingProgress}%` }} />
        </div>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
          <span className="text-9xl font-black text-white drop-shadow-2xl animate-ping">{countdown}</span>
        </div>
      )}

      <div className="relative p-4 flex items-center justify-between z-10">
        <button onClick={() => navigate("/feed")} className="p-2 bg-black/20 rounded-full"><X size={28}/></button>
        <button onClick={() => setActiveDrawer("music")} className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold border border-white/10">
          <Music size={16}/> {selectedMusic?.name || "Ajouter un son"}
        </button>
        <div className="w-10"/>
      </div>

      {/* Barre de droite mise à jour (Étape 1) */}
      <div className="absolute right-4 top-20 flex flex-col gap-4 z-10">
        <button onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")} className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5"><RotateCw size={24}/></div>
          <span className="text-[10px] font-bold">Retourner</span>
        </button>
        <button onClick={() => setFlashEnabled(!flashEnabled)} className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5">{flashEnabled ? <Zap size={24} className="text-yellow-400"/> : <ZapOff size={24}/>}</div>
          <span className="text-[10px] font-bold">Flash</span>
        </button>
        <button onClick={() => setTimerDuration(t => t === 3 ? 10 : 3)} className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5"><Timer size={24}/></div>
          <span className="text-[10px] font-bold">Minuteur</span>
        </button>
        <button onClick={() => setLayoutMode(!layoutMode)} className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5"><Layout size={24}/></div>
          <span className="text-[10px] font-bold">Layout</span>
        </button>
        <button onClick={() => setActiveDrawer("beauty")} className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5"><Wand2 size={24}/></div>
          <span className="text-[10px] font-bold">Beauté</span>
        </button>
        <button onClick={() => setActiveDrawer("filters")} className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5 text-yellow-400"><Sparkles size={24}/></div>
          <span className="text-[10px] font-bold">Filtres</span>
        </button>
        <button onClick={() => setActiveDrawer("effects")} className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5"><Smile size={24}/></div>
          <span className="text-[10px] font-bold">Effets</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md border border-white/5"><ChevronDown size={24}/></div>
          <span className="text-[10px] font-bold">Plus</span>
        </button>
      </div>

      {activeDrawer === "music" && (
        <Drawer title="Musique" onClose={() => setActiveDrawer("none")}>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-4">
            {MUSICS.map(m => (
              <div key={m.id} onClick={() => { 
                setSelectedMusic(m); 
                setActiveDrawer("none");
                if (audioRef.current) {
                  audioRef.current.src = m.url;
                  audioRef.current.play();
                }
              }} className="p-4 bg-white/5 rounded-2xl flex items-center justify-between active:scale-95 transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center"><Music size={24}/></div>
                  <div><p className="font-bold">{m.name}</p><p className="text-xs text-white/40">{m.artist}</p></div>
                </div>
                <Play size={20} className="text-white/60"/>
              </div>
            ))}
          </div>
          <button 
            onClick={() => audioInputRef.current?.click()}
            className="w-full py-4 bg-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
          >
            <ImageIcon size={20}/> Importer depuis le téléphone
          </button>
        </Drawer>
      )}

      {/* Drawer Beauté refait (Étape 4) */}
      {activeDrawer === "beauty" && (
        <Drawer title="Beauté" onClose={() => setActiveDrawer("none")}>
          <div className="space-y-6 py-4">
  {[
    { label: "Lissage peau", value: skinSmooth, setter: setSkinSmooth },
    { label: "Éclaircir visage", value: faceBright, setter: setFaceBright },
    { label: "Netteté visage", value: faceSharp, setter: setFaceSharp },
    { label: "Affiner visage", value: faceSlim, setter: setFaceSlim },
    { label: "Grands yeux", value: bigEyes, setter: setBigEyes },
    { label: "Lèvres", value: lipSize, setter: setLipSize }
  ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={item.value} 
                  onChange={(e) => item.setter(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>
            ))}
          </div>
        </Drawer>
      )}

      {activeDrawer === "filters" && (
        <Drawer title="Filtres" onClose={() => setActiveDrawer("none")}>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setActiveFilter(f)} className={`flex flex-col items-center min-w-[70px] transition-all ${activeFilter.id === f.id ? 'scale-110' : 'opacity-50'}`}>
                <div className={`w-14 h-14 rounded-full border-2 mb-2 ${activeFilter.id === f.id ? 'border-white' : 'border-transparent'} overflow-hidden bg-gray-800 relative`}>
                  {/* Miniature avec simulation de flux réel (Étape 7) */}
                  <video autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-blue-400 opacity-20" />
                </div>
                <span className="text-[10px] font-bold">{f.name}</span>
              </button>
            ))}
          </div>
        </Drawer>
      )}

      {/* Barre d'effets horizontale TikTok (Étape 2) */}
      {activeDrawer === "effects" && (
        <Drawer title="Effets" onClose={() => setActiveDrawer("none")}>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {EFFECTS.map(effect => (
              <button
                key={effect.id}
                onClick={() => { setActiveEffect(effect); setActiveDrawer("none"); }}
                className={`flex flex-col items-center min-w-[80px] transition-all ${activeEffect.id === effect.id ? 'scale-110' : 'opacity-60'}`}
              >
                <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${activeEffect.id === effect.id ? 'border-red-500' : 'border-white'}`}>
                  <img src={effect.preview} className="w-full h-full object-cover bg-neutral-800" alt={effect.name} />
                </div>
                <span className="text-xs mt-2 font-medium">{effect.name}</span>
              </button>
            ))}
          </div>
        </Drawer>
      )}

      <div className="mt-auto pb-10 pt-4 z-10 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-center items-center gap-6 mb-8 overflow-x-auto px-4 no-scrollbar">
          {["15 s", "60 s", "10 min", "Photo"].map((mode) => (
            <button key={mode} onClick={() => setSelectedDuration(mode)} className={`text-sm font-black whitespace-nowrap px-4 py-1 rounded-full transition-all ${selectedDuration === mode ? "bg-white text-black scale-110 shadow-xl" : "text-white/50"}`}>
              {mode}
            </button>
          ))}
        </div>

        {/* Réorganisation Galerie / Bouton / Effets (Étape 6) */}
        <div className="flex items-center justify-evenly px-6">
          <button onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-1 opacity-80">
            <input ref={inputRef} type="file" accept="video/*,image/*" onChange={handleFileImport} className="hidden" />
            <div className="w-12 h-12 rounded-xl border-2 border-white/30 bg-black/40 flex items-center justify-center overflow-hidden">
              <ImageIcon size={24}/>
            </div>
            <span className="text-[10px] font-bold uppercase">Galerie</span>
          </button>
          
          <div className="relative flex items-center justify-center">
            <div className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-500 animate-pulse scale-125' : 'border-white'} flex items-center justify-center p-1.5 transition-all duration-300`}>
              <button 
                onClick={handleCaptureBtn} 
                className={`w-full h-full bg-red-500 rounded-full shadow-2xl transition-all ${isRecording ? 'scale-75 rounded-lg' : 'scale-100'}`} 
              />
            </div>
          </div>

          <button onClick={() => setActiveDrawer("effects")} className="flex flex-col items-center gap-1 opacity-80">
             <div className="w-12 h-12 rounded-full border-2 border-white/30 bg-black/40 flex items-center justify-center overflow-hidden relative">
               <img src={activeEffect.preview} className="w-full h-full object-cover" />
               <Smile size={20} className="absolute inset-0 m-auto text-white drop-shadow-md"/>
             </div>
             <span className="text-[10px] font-bold uppercase">Effets</span>
          </button>
        </div>
      </div>
    </div>
  );

  // --- STEP 2: EDIT ---
  if (step === "edit") return (
    <div className="h-screen bg-black text-white relative flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        {file?.type.startsWith("image/") ? <img src={previewUrl!} className="w-full h-full object-cover" /> : <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />}
        {overlayTexts.map(t => (
          <div key={t.id} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white text-black px-4 py-2 rounded font-black text-2xl shadow-2xl transform rotate-[-2deg]">{t.text}</span>
          </div>
        ))}
      </div>

      {isAddingText && (
        <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex justify-end"><button onClick={() => { if(tempText) setOverlayTexts([...overlayTexts, {id: Date.now(), text: tempText}]); setIsAddingText(false); setTempText(""); }} className="bg-white text-black px-4 py-1 rounded-full font-bold">Terminer</button></div>
          <input autoFocus value={tempText} onChange={(e) => setTempText(e.target.value)} className="mt-40 bg-transparent text-center text-4xl font-black focus:outline-none placeholder:text-white/20" placeholder="Tapez ici..." />
        </div>
      )}

      <div className="relative h-full flex flex-col z-10 p-4">
        <div className="flex justify-between">
          <button onClick={() => setStep("capture")} className="p-2 bg-black/40 rounded-full backdrop-blur-md"><ArrowLeft size={24}/></button>
          <button onClick={() => setStep("publish")} className="bg-red-500 px-8 py-2.5 rounded-full font-black shadow-lg active:scale-95 transition-transform">SUIVANT</button>
        </div>

        <div className="absolute right-4 top-20 flex flex-col gap-6">
          <button onClick={() => setIsAddingText(true)} className="flex flex-col items-center"><div className="p-3.5 bg-black/40 rounded-full backdrop-blur-md border border-white/10"><Type size={26}/></div><span className="text-[10px] font-bold mt-1">Texte</span></button>
          <button className="flex flex-col items-center"><div className="p-3.5 bg-black/40 rounded-full backdrop-blur-md border border-white/10"><Sticker size={26}/></div><span className="text-[10px] font-bold mt-1">Stickers</span></button>
          <button className="flex flex-col items-center"><div className="p-3.5 bg-black/40 rounded-full backdrop-blur-md border border-white/10"><Scissors size={26}/></div><span className="text-[10px] font-bold mt-1">Couper</span></button>
          <button className="flex flex-col items-center"><div className="p-3.5 bg-black/40 rounded-full backdrop-blur-md border border-white/10"><Volume2 size={26}/></div><span className="text-[10px] font-bold mt-1">Volume</span></button>
        </div>
      </div>
    </div>
  );

  // --- STEP 3: PUBLISH ---
  return (
    <div className="h-screen bg-neutral-950 text-white flex flex-col">
      <div className="p-4 flex items-center border-b border-white/5 bg-neutral-900">
        <button onClick={() => setStep("edit")} className="p-2"><ArrowLeft size={24}/></button>
        <h1 className="flex-1 text-center font-black text-lg uppercase tracking-widest">Publier</h1>
        <div className="w-10"/>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        <div className="flex gap-5 items-start">
          <div className="w-32 aspect-[9/16] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
            {file?.type.startsWith("image/") ? <img src={previewUrl!} className="w-full h-full object-cover" /> : <video src={previewUrl!} className="w-full h-full object-cover" />}
          </div>
          <textarea placeholder="Décrire votre création... #hashtag @amis" value={description} onChange={(e) => setDescription(e.target.value)} className="flex-1 bg-transparent text-lg focus:outline-none h-48 resize-none pt-2" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"><span className="font-bold">Qui peut voir</span><span className="text-white/40 font-bold">Public &gt;</span></div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"><span className="font-bold">Commentaires</span><div className="w-12 h-6 bg-green-500 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md"/></div></div>
        </div>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4 bg-neutral-900 border-t border-white/5">
        <button className="bg-neutral-800 py-4 rounded-2xl font-black uppercase tracking-widest">Brouillon</button>
        <button onClick={handlePublish} disabled={isLoading} className="bg-red-500 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-500/20 disabled:opacity-50">{isLoading ? <Loader2 className="animate-spin mx-auto"/> : "Publier"}</button>
      </div>
    </div>
  );
}
