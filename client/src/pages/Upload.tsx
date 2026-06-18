import { useRef, useState, useEffect } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [createMode, setCreateMode] = useState<
    "menu" | "gallery" | "camera" | "photo" | "text"
  >("camera"); // Par défaut sur caméra pour correspondre à l'image
  
  const [selectedDuration, setSelectedDuration] = useState("15 s");

  const uploadMutation = trpc.video.upload.useMutation();

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <p>Veuillez vous connecter</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.type.startsWith("video/") && createMode !== "photo") {
      toast.error("Veuillez sélectionner une vidéo");
      return;
    }
    
    setFile(selectedFile);
  };

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
      const videoUrl = uploadData.videoUrl;

      await uploadMutation.mutateAsync({
        title: title || file.name,
        videoUrl: videoUrl,
      });

      setUploadSuccess(true);
      toast.success("✅ Publié avec succès !");

      setTimeout(() => {
        navigate("/feed");
      }, 2000);

    } catch (error) {
      console.error("[Upload] Error:", error);
      toast.error("❌ Erreur lors de l'upload.");
      setUploadSuccess(false);
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

  // Interface Caméra Style TikTok
  if (!file && createMode === "camera") {
    return (
      <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <button onClick={() => navigate("/feed")} className="p-2">
            <X size={28} />
          </button>
          
          <button className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
            <Music size={16} />
            Ajouter un son
          </button>
          
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Right Sidebar Controls */}
        <div className="absolute right-4 top-20 flex flex-col gap-6 z-10">
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 hover:bg-white/10 rounded-full"><RotateCw size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 hover:bg-white/10 rounded-full"><Zap size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 hover:bg-white/10 rounded-full"><Timer size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 hover:bg-white/10 rounded-full"><LayoutGrid size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 hover:bg-white/10 rounded-full"><UserPlus size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 hover:bg-white/10 rounded-full"><Smile size={26} /></div>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2 hover:bg-white/10 rounded-full"><ChevronDown size={26} /></div>
          </button>
        </div>

        {/* Camera Viewport (Simulated) */}
        <div className="flex-1 flex items-center justify-center bg-neutral-900">
           {/* Ici on pourrait mettre le flux vidéo réel avec getUserMedia */}
           <div className="text-neutral-700 text-sm">Viseur caméra</div>
        </div>

        {/* Bottom Controls */}
        <div className="pb-12 pt-4 bg-gradient-to-t from-black to-transparent z-10">
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
            {/* Effects/Filters placeholder */}
            <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden bg-gray-800">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=1" alt="effect" className="w-full h-full object-cover" />
            </div>

            {/* Main Record Button */}
            <div className="relative flex items-center justify-center">
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Outer Ring */}
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1">
                {/* Inner Button */}
                <button 
                  onClick={() => inputRef.current?.click()}
                  className="w-full h-full bg-red-500 rounded-full active:scale-90 transition-transform"
                />
              </div>
            </div>

            {/* Upload/Gallery Button */}
            <button 
              onClick={() => {
                setCreateMode("gallery");
                inputRef.current?.click();
              }}
              className="flex flex-col items-center gap-1"
            >
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

  // Preview / Metadata Form (Après sélection du fichier)
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
          <div className="w-full aspect-[9/16] bg-neutral-900 rounded-2xl overflow-hidden relative">
            <video
              src={previewUrl}
              controls
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
            placeholder="Décrire votre vidéo #hashtag @amis"
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
