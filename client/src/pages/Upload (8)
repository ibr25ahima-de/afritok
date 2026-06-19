import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  CheckCircle, 
  X, 
  Music, 
  RotateCw, 
  Zap, 
  Timer, 
  LayoutGrid, 
  UserPlus, 
  Smile, 
  ChevronDown,
  Image as ImageIcon,
  Scissors,
  Type,
  Sticker,
  Volume2,
  Sparkles,
  ArrowLeft,
  Check
} from "lucide-react";
import { toast } from "sonner";

// Configuration des filtres
const FILTERS = [
  { name: "Normal", class: "" },
  { name: "Clair", class: "brightness-125 contrast-110" },
  { name: "Noir & Blanc", class: "grayscale" },
  { name: "Vintage", class: "sepia brightness-90 contrast-125" },
  { name: "Froid", class: "hue-rotate-180 saturate-150" },
  { name: "Chaud", class: "sepia(0.5) saturate-200" }
];

type Step = "capture" | "edit" | "publish";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State Global de Flux
  const [step, setStep] = useState<Step>("capture");
  
  // State Capture
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("15 s");
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);

  // State Media (Fichier capturé)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // State Publication
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadMutation = trpc.video.upload.useMutation();

  // --- LOGIQUE CAPTURE ---
  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setStream(newStream);
      if (videoRef.current) videoRef.current.srcObject = newStream;
    } catch (err) {
      toast.error("Caméra inaccessible");
    }
  }, [facingMode, stream]);

  useEffect(() => {
    if (step === "capture") startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [step, facingMode]);

  const handleCapture = () => {
    if (selectedDuration === "PHOTO") {
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
              const photoFile = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
              setFile(photoFile);
              setStep("edit");
            }
          }, "image/jpeg");
        }
      }
    } else {
      if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
      } else {
        if (!stream) return;
        const chunks: Blob[] = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          setFile(new File([blob], `video-${Date.now()}.webm`, { type: "video/webm" }));
          setStep("edit");
        };
        mediaRecorder.start();
        setIsRecording(true);
      }
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStep("edit");
    }
  };

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  // --- LOGIQUE PUBLICATION ---
  const handlePublish = async () => {
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", String(user.id));
      const res = await fetch("/api/upload-video", { method: "POST", body: formData });
      const data = await res.json();
      await uploadMutation.mutateAsync({ title: title || "Nouveau post", videoUrl: data.videoUrl });
      setUploadSuccess(true);
      setTimeout(() => navigate("/feed"), 2000);
    } catch (e) {
      toast.error("Erreur d'upload");
    } finally {
      setIsLoading(false);
    }
  };

  if (uploadSuccess) return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <CheckCircle size={64} className="text-green-500 animate-bounce" />
      <h2 className="text-2xl font-bold">Publié ! 🎉</h2>
    </div>
  );

  // --- RENDU ÉTAPE 1 : CAPTURE ---
  if (step === "capture") {
    return (
      <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
        <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover transition-all ${activeFilter.class}`} />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        <div className="relative p-4 flex items-center justify-between z-10">
          <button onClick={() => navigate("/feed")} className="p-2"><X size={28} /></button>
          <button className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
            <Music size={16} /> {selectedMusic || "Ajouter un son"}
          </button>
          <div className="w-10" />
        </div>

        <div className="absolute right-4 top-20 flex flex-col gap-6 z-10">
          <button onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")} className="flex flex-col items-center">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><RotateCw size={26} /></div>
            <span className="text-[10px] mt-1">Retourner</span>
          </button>
          <button className="flex flex-col items-center">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><Zap size={26} /></div>
            <span className="text-[10px] mt-1">Flash</span>
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="flex flex-col items-center">
            <div className={`p-2 bg-black/20 rounded-full backdrop-blur-sm ${showFilters ? 'text-yellow-400' : ''}`}><Sparkles size={26} /></div>
            <span className="text-[10px] mt-1">Filtres</span>
          </button>
        </div>

        {showFilters && (
          <div className="absolute bottom-40 left-0 right-0 z-20 px-4">
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 bg-black/40 backdrop-blur-md rounded-t-2xl">
              {FILTERS.map(f => (
                <button key={f.name} onClick={() => setActiveFilter(f)} className={`flex flex-col items-center min-w-[70px] ${activeFilter.name === f.name ? 'text-white' : 'text-white/50'}`}>
                  <div className={`w-12 h-12 rounded-full border-2 mb-1 ${activeFilter.name === f.name ? 'border-white' : 'border-transparent'} bg-gray-700 overflow-hidden`}>
                    <div className={`w-full h-full ${f.class} bg-gradient-to-br from-purple-500 to-pink-500`} />
                  </div>
                  <span className="text-[10px]">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pb-12 pt-4 z-10">
          <div className="flex justify-center items-center gap-6 mb-8 overflow-x-auto px-4 no-scrollbar">
            {["10 min", "60 s", "15 s", "PHOTO", "TEXTE"].map((mode) => (
              <button key={mode} onClick={() => setSelectedDuration(mode)} className={`text-sm font-bold whitespace-nowrap px-3 py-1 rounded-full transition-all ${selectedDuration === mode ? "bg-white text-black scale-110" : "text-white/60"}`}>
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-evenly px-6">
            <button className="flex flex-col items-center gap-1">
               <div className="w-12 h-12 rounded-full border-2 border-white/50 bg-gray-800 flex items-center justify-center"><Smile size={28} className="text-yellow-400" /></div>
               <span className="text-[10px]">Effets</span>
            </button>
            <div className="relative flex items-center justify-center">
              <div className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-500 animate-pulse' : 'border-white'} flex items-center justify-center p-1`}>
                <button onClick={handleCapture} className={`w-full h-full bg-red-500 rounded-full transition-all ${isRecording ? 'scale-75 rounded-lg' : 'scale-100'}`} />
              </div>
            </div>
            <button onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-1">
              <input ref={inputRef} type="file" accept="video/*,image/*" onChange={handleFileImport} className="hidden" />
              <div className="w-12 h-12 rounded-lg border-2 border-white/50 bg-gray-800 flex items-center justify-center overflow-hidden"><ImageIcon size={24} className="text-white/70" /></div>
              <span className="text-[10px]">Déposer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU ÉTAPE 2 : MONTAGE ---
  if (step === "edit") {
    return (
      <div className="h-screen bg-black text-white relative flex flex-col">
        {/* Preview Plein Écran */}
        <div className="absolute inset-0 w-full h-full">
          {file?.type.startsWith("image/") ? (
            <img src={previewUrl!} className="w-full h-full object-cover" />
          ) : (
            <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />
          )}
        </div>

        {/* Overlay Montage UI */}
        <div className="relative h-full flex flex-col z-10">
          <div className="p-4 flex items-center justify-between">
            <button onClick={() => setStep("capture")} className="p-2 bg-black/20 rounded-full"><ArrowLeft size={24} /></button>
            <button onClick={() => setStep("publish")} className="bg-red-500 px-6 py-2 rounded-full font-bold flex items-center gap-2">
              Suivant <Check size={20} />
            </button>
          </div>

          <div className="absolute right-4 top-20 flex flex-col gap-6">
            <button className="flex flex-col items-center"><div className="p-3 bg-black/40 rounded-full backdrop-blur-md"><Type size={24} /></div><span className="text-[10px] mt-1">Texte</span></button>
            <button className="flex flex-col items-center"><div className="p-3 bg-black/40 rounded-full backdrop-blur-md"><Sticker size={24} /></div><span className="text-[10px] mt-1">Stickers</span></button>
            <button className="flex flex-col items-center"><div className="p-3 bg-black/40 rounded-full backdrop-blur-md"><Scissors size={24} /></div><span className="text-[10px] mt-1">Couper</span></button>
            <button className="flex flex-col items-center"><div className="p-3 bg-black/40 rounded-full backdrop-blur-md"><Volume2 size={24} /></div><span className="text-[10px] mt-1">Volume</span></button>
            <button className="flex flex-col items-center"><div className="p-3 bg-black/40 rounded-full backdrop-blur-md"><Sparkles size={24} /></div><span className="text-[10px] mt-1">Effets</span></button>
          </div>

          <div className="mt-auto p-6 flex justify-center">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
              <Music size={16} className="animate-spin-slow" /> Montage en cours...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU ÉTAPE 3 : PUBLICATION ---
  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col">
      <div className="p-4 flex items-center border-b border-white/5">
        <button onClick={() => setStep("edit")} className="p-2"><ArrowLeft size={24} /></button>
        <h1 className="flex-1 text-center font-bold text-lg">Publier</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <div className="flex gap-4 items-start">
          <div className="w-32 aspect-[9/16] bg-neutral-900 rounded-lg overflow-hidden shadow-xl border border-white/10">
            {file?.type.startsWith("image/") ? (
              <img src={previewUrl!} className="w-full h-full object-cover" />
            ) : (
              <video src={previewUrl!} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              placeholder="Décrire votre création #tendance #afritok"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-transparent text-lg focus:outline-none h-40 resize-none placeholder:text-neutral-600"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <span className="font-medium">Qui peut voir cette vidéo</span>
            <span className="text-neutral-400">Tout le monde &gt;</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <span className="font-medium">Autoriser les commentaires</span>
            <div className="w-12 h-6 bg-green-500 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 bg-slate-900 border-t border-white/5">
        <button className="bg-neutral-800 py-4 rounded-xl font-bold text-lg">Brouillon</button>
        <button
          onClick={handlePublish}
          disabled={isLoading}
          className="bg-red-500 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : "Publier"}
        </button>
      </div>
    </div>
  );
}
