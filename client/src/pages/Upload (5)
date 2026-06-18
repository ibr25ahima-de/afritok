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
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Refs pour la caméra
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
  const [selectedDuration, setSelectedDuration] = useState("15 s");

  const uploadMutation = trpc.video.upload.useMutation();

  // Démarrer la caméra
  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Erreur caméra:", err);
      toast.error("Impossible d'accéder à la caméra");
    }
  }, [facingMode, stream]);

  useEffect(() => {
    if (!file) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [file, facingMode]); // Redémarrer si on change de face ou si on revient du preview

  // Gérer l'enregistrement
  const handleStartRecording = () => {
    if (!stream) return;
    setRecordedChunks([]);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const recordedFile = new File([blob], "recorded-video.webm", { type: "video/webm" });
      setFile(recordedFile);
    };

    mediaRecorder.start();
    setIsRecording(true);
    toast.info("Enregistrement en cours...");
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  };

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleSubmit = async () => {
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", String(user.id));

      const uploadRes = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload échoué");
      const uploadData = await uploadRes.json();
      
      await uploadMutation.mutateAsync({
        title: title || "Ma vidéo",
        videoUrl: uploadData.videoUrl,
      });

      setUploadSuccess(true);
      toast.success("✅ Publié avec succès !");
      setTimeout(() => navigate("/feed"), 2000);
    } catch (error) {
      toast.error("❌ Erreur lors de l'upload.");
    } finally {
      setIsLoading(false);
    }
  };

  if (uploadSuccess) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <CheckCircle size={64} className="text-green-500 animate-bounce" />
        <h2 className="text-2xl font-bold">Publié avec succès ! 🎉</h2>
      </div>
    );
  }

  // Interface Caméra Active
  if (!file) {
    return (
      <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
        {/* Flux Vidéo Réel */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay TikTok UI */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        {/* Top Bar */}
        <div className="relative p-4 flex items-center justify-between z-10">
          <button onClick={() => navigate("/feed")} className="p-2 pointer-events-auto">
            <X size={28} />
          </button>
          
          <button className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium pointer-events-auto">
            <Music size={16} />
            Ajouter un son
          </button>
          
          <div className="w-10" />
        </div>

        {/* Right Sidebar Controls */}
        <div className="absolute right-4 top-20 flex flex-col gap-6 z-10 pointer-events-auto">
          <button onClick={toggleCamera} className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><RotateCw size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><Zap size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><Timer size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><LayoutGrid size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm"><Smile size={26} /></div>
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="mt-auto pb-12 pt-4 z-10 pointer-events-auto">
          {/* Duration Selector */}
          <div className="flex justify-center items-center gap-6 mb-8 overflow-x-auto px-4 no-scrollbar">
            {["10 min", "60 s", "15 s", "PHOTO", "TEXTE"].map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedDuration(mode)}
                className={`text-sm font-bold whitespace-nowrap px-3 py-1 rounded-full transition-all ${
                  selectedDuration === mode 
                  ? "bg-white text-black scale-110" 
                  : "text-white/60"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Capture Row */}
          <div className="flex items-center justify-evenly px-6">
            {/* Filters/Effects */}
            <button className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden bg-gray-800 flex items-center justify-center">
               <Smile size={28} className="text-yellow-400" />
            </button>

            {/* Main Record Button */}
            <div className="relative flex items-center justify-center">
              <div className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-white/50' : 'border-white'} flex items-center justify-center p-1 transition-all`}>
                <button 
                  onMouseDown={handleStartRecording}
                  onMouseUp={handleStopRecording}
                  onTouchStart={handleStartRecording}
                  onTouchEnd={handleStopRecording}
                  className={`w-full h-full bg-red-500 rounded-full transition-all ${isRecording ? 'scale-75 rounded-lg' : 'scale-100'}`}
                />
              </div>
              {isRecording && (
                <div className="absolute -top-12 text-red-500 font-bold animate-pulse">
                  ENREGISTREMENT...
                </div>
              )}
            </div>

            {/* Gallery */}
            <button 
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-1"
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-lg border-2 border-white/50 bg-gray-800 flex items-center justify-center overflow-hidden">
                <ImageIcon size={24} className="text-white/70" />
              </div>
            </button>
          </div>

          {/* Bottom Tabs */}
          <div className="flex justify-center gap-12 mt-8 font-bold text-sm tracking-widest">
            <button className="text-white">PUBLIER</button>
            <button className="text-white/40">CRÉER</button>
          </div>
        </div>
      </div>
    );
  }

  // Preview Form
  return (
    <div className="h-screen bg-black text-white flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setFile(null)} className="p-2">
          <X size={24} />
        </button>
        <h1 className="text-lg font-bold">Publier</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {previewUrl && (
          <div className="w-full aspect-[9/16] bg-neutral-900 rounded-2xl overflow-hidden">
            <video
              src={previewUrl}
              controls
              autoPlay
              loop
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Ajouter un titre..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-b border-white/10 py-3 text-lg focus:outline-none focus:border-red-500"
          />
          <textarea
            placeholder="Décrire votre vidéo..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent border-b border-white/10 py-3 focus:outline-none focus:border-red-500 h-24 resize-none"
          />
        </div>
      </div>

      <div className="py-4">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-red-500 py-4 rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : "Publier"}
        </button>
      </div>
    </div>
  );
}
