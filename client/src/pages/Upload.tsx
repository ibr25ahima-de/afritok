import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CameraRecorder } from "@/components/CameraRecorder";
import Publish from "./Publish";
import { RefreshCw, Type, Music, Smile, MapPin, Users } from "lucide-react";

type Step = "capture" | "edit" | "publish";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  const [step, setStep] = useState<Step>("capture");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!isAuthenticated) return <div className="h-screen bg-black flex items-center justify-center text-white">Connexion requise</div>;

  // --- ÉTAPE 1: CAPTURE ---
  if (step === "capture") {
    return (
      <CameraRecorder 
        onVideoRecorded={(blob, duration) => {
          setFile(new File([blob], "video.webm", { type: "video/webm" }));
          setRecordedDuration(duration);
          setStep("edit");
        }}
        onPhotoTaken={(blob) => {
          setFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
          setStep("edit");
        }}
        onClose={() => navigate("/feed")}
        onOpenMusic={() => console.log("Open Music")}
        onOpenEffects={() => console.log("Open Effects")}
      />
    );
  }

  // --- ÉTAPE 2: MODIFICATION (Style TikTok complet) ---
  if (step === "edit") {
    return (
      <div className="h-screen bg-black text-white relative flex flex-col overflow-hidden">
        {/* Vidéo en plein écran */}
        <div className="absolute inset-0">
          {file?.type.startsWith("image/") ? (
            <img src={previewUrl!} className="w-full h-full object-cover" alt="preview" />
          ) : (
            <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />
          )}
        </div>
        
        {/* Barre latérale droite d'édition */}
        <div className="absolute right-4 top-16 flex flex-col gap-6 z-20 items-center">
          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full"><Type size={24}/></div>
            <span className="text-[10px] font-bold">Texte</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full"><Smile size={24}/></div>
            <span className="text-[10px] font-bold">Stickers</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full"><RefreshCw size={24}/></div>
            <span className="text-[10px] font-bold">Effets</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 bg-black/20 backdrop-blur-md rounded-full"><Music size={24}/></div>
            <span className="text-[10px] font-bold">Audio</span>
          </button>
        </div>

        {/* Boutons du bas */}
        <div className="mt-auto p-4 pb-10 z-20 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex gap-4 mb-6 justify-center">
            <button className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold border border-white/10">
              <MapPin size={14}/> Lieu
            </button>
            <button className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold border border-white/10">
              <Users size={14}/> Identifier
            </button>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => { setFile(null); setStep("capture"); }} 
              className="flex-1 bg-white/10 backdrop-blur-md py-3.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-blue-400 overflow-hidden">
                <img src={user?.image || ""} alt="" className="w-full h-full object-cover"/>
              </div>
              Ta Story
            </button>
            <button 
              onClick={() => setStep("publish")} 
              className="flex-1 bg-red-500 py-3.5 rounded-full font-black text-white active:scale-95 transition-all shadow-lg"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ÉTAPE 3: PUBLICATION ---
  return <Publish />;
        }
      
