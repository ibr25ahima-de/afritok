import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CameraRecorder } from "@/components/CameraRecorder";
import Publish from "./Publish";
import AudioSelector from "@/components/AudioSelector.tsx";
import { useUpload } from "@/contexts/UploadContext";
import { RefreshCw, Type, Music, Smile, MapPin, Users } from "lucide-react";

type Step = "capture" | "edit" | "publish";

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);

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
          onOpenEffects={() => console.log("Open Effects")}
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
        <div className="absolute inset-0">
          {file?.type.startsWith("image/") ? (
            <img src={preview!} className="w-full h-full object-cover" alt="preview" />
          ) : (
            <video 
              ref={videoRef}
              src={preview!} 
              autoPlay 
              loop 
              muted 
              className="w-full h-full object-cover" 
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
        
        {/* Barre latérale droite — Style harmonisé avec CameraRecorder */}
        <div className="absolute right-4 top-16 flex flex-col gap-5 z-20 items-center">
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Type size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Texte</span>
          </button>
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
              <Smile size={22}/>
            </div>
            <span className="text-[10px] font-bold shadow-sm">Stickers</span>
          </button>
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-2.5 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 group-active:scale-90 transition-all shadow-lg">
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
            <button className="flex items-center gap-2 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-sm active:scale-95 transition-all">
              <MapPin size={14}/> Lieu
            </button>
            <button className="flex items-center gap-2 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-sm active:scale-95 transition-all">
              <Users size={14}/> Identifier
            </button>
          </div>

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
