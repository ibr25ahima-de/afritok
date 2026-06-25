import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CameraRecorder } from "@/components/CameraRecorder";
import { RefreshCw } from "lucide-react";

type Step = "capture" | "edit" | "publish";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  
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

  if (step === "edit") {
    return (
      <div className="h-screen bg-black text-white relative flex flex-col">
        <div className="absolute inset-0">
          {file?.type.startsWith("image/") ? (
            <img src={previewUrl!} className="w-full h-full object-cover" alt="preview" />
          ) : (
            <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />
          )}
        </div>
        
        <div className="absolute right-4 top-20 flex flex-col gap-6 z-20">
          <div className="flex flex-col items-center gap-1">
            <div className="p-2 bg-black/20 rounded-full"><RefreshCw size={24}/></div>
          </div>
          <div className="flex flex-col items-center gap-1 text-sm font-bold">Aa</div>
        </div>

        <div className="mt-auto p-4 flex gap-3 z-20">
          <button onClick={() => { setFile(null); setStep("capture"); }} className="flex-1 bg-white/20 py-3 rounded-full font-bold">
            Retour
          </button>
          <button onClick={() => setStep("publish")} className="flex-1 bg-red-500 py-3 rounded-full font-bold">Suivant</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-950 text-white flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center">
        <button onClick={() => setStep("edit")}>Retour</button>
        <h1 className="flex-1 text-center font-black uppercase">Publier</h1>
      </div>
      <div className="p-5">
        <p>Interface de publication en cours...</p>
        <button onClick={() => setStep("capture")} className="mt-4 bg-red-500 px-4 py-2 rounded">Recommencer</button>
      </div>
    </div>
  );
}
