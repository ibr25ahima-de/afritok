import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, Music, RotateCw, Zap, Timer, 
  Sparkles, ChevronDown, Wand2, 
  ZapOff, Layout, Gauge, ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface CameraRecorderProps {
  onVideoRecorded?: (blob: Blob, duration: number) => void;
  onPhotoTaken?: (blob: Blob) => void;
  onClose?: () => void;
  onOpenMusic?: () => void;
  onOpenEffects?: () => void;
  selectedMusic?: { name: string; artist: string } | null;
}

export const CameraRecorder: React.FC<CameraRecorderProps> = ({
  onVideoRecorded,
  onPhotoTaken,
  onClose,
  onOpenMusic,
  onOpenEffects,
  selectedMusic
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // States
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedDuration, setSelectedDuration] = useState("15 s");
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showMoreIcons, setShowMoreIcons] = useState(false);
  const [activeSpeed, setActiveSpeed] = useState("1x");
  const [timerValue, setTimerValue] = useState(0);

  // --- MEDIAPIPE (Détection faciale) ---
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` },
          runningMode: "VIDEO", numFaces: 1
        });
      } catch (err) {
        console.error("MediaPipe initialization failed:", err);
      }
    };
    init();
  }, []);

  const detectFace = useCallback(() => {
    if (videoRef.current && faceLandmarkerRef.current && faceCanvasRef.current) {
      const video = videoRef.current;
      if (video.readyState === 4) {
        const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
        const ctx = faceCanvasRef.current.getContext("2d");
        if (ctx) {
          faceCanvasRef.current.width = video.videoWidth;
          faceCanvasRef.current.height = video.videoHeight;
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          if (results.faceLandmarks) {
            ctx.fillStyle = "#00FF00";
            results.faceLandmarks.forEach(lm => lm.forEach(p => {
              ctx.beginPath(); ctx.arc(p.x * ctx.canvas.width, p.y * ctx.canvas.height, 1, 0, 2 * Math.PI); ctx.fill();
            }));
          }
        }
      }
    }
    requestAnimationFrame(detectFace);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(detectFace);
    return () => cancelAnimationFrame(id);
  }, [detectFace]);

  // --- GESTION DE LA CAMÉRA ---
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
      console.error("Camera access error:", err);
      toast.error("Impossible d'accéder à la caméra");
    }
  }, [facingMode]);

  useEffect(() => { 
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  // --- LOGIQUE DE CAPTURE ---
  const handleCapture = () => {
    if (selectedDuration === "Photo") {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(b => { 
          if(b && onPhotoTaken) onPhotoTaken(b);
        }, 'image/jpeg', 0.95);
      }
    } else if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      if (!streamRef.current) return;
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => { 
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (onVideoRecorded) onVideoRecorded(blob, recordingTime);
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          const max = selectedDuration === "10 min" ? 600 : (selectedDuration === "60 s" ? 60 : 15);
          if (prev >= max) {
            if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
            setIsRecording(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, selectedDuration]);

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col font-sans">
      {/* Aperçu Vidéo */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={faceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* Barre de progression */}
      {isRecording && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-30">
          <div 
            className="h-full bg-yellow-400 transition-all duration-100" 
            style={{ width: `${(recordingTime / (selectedDuration === "10 min" ? 600 : (selectedDuration === "60 s" ? 60 : 15))) * 100}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="relative p-4 flex justify-between items-start z-20">
        <button onClick={onClose} className="p-2 bg-black/10 rounded-full active:scale-90 transition-transform"><X size={28}/></button>
        
        <button 
          onClick={onOpenMusic} 
          className="bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold border border-white/10 active:scale-95 transition-transform"
        >
          <Music size={16}/> 
          <span className="max-w-[120px] truncate">{selectedMusic?.name || "Ajouter un son"}</span>
        </button>

        {/* Barre latérale droite */}
        <div className="flex flex-col gap-5 items-center">
           <button onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")} className="flex flex-col items-center gap-1 group">
             <div className="p-2.5 bg-black/20 rounded-full group-active:scale-90 transition-transform"><RotateCw size={26}/></div>
             <span className="text-[10px] font-bold">Retourner</span>
           </button>
           
           <button onClick={() => setActiveSpeed(s => s === "1x" ? "2x" : "1x")} className="flex flex-col items-center gap-1 group">
             <div className={`p-2.5 rounded-full group-active:scale-90 transition-transform ${activeSpeed !== "1x" ? "bg-yellow-400 text-black" : "bg-black/20"}`}><Gauge size={26}/></div>
             <span className="text-[10px] font-bold">Vitesse</span>
           </button>
           
           <button className="flex flex-col items-center gap-1 group">
             <div className="p-2.5 bg-black/20 rounded-full group-active:scale-90 transition-transform"><Wand2 size={26}/></div>
             <span className="text-[10px] font-bold">Filtres</span>
           </button>
           
           <button onClick={() => setTimerValue(v => v === 0 ? 3 : 0)} className="flex flex-col items-center gap-1 group">
             <div className={`p-2.5 rounded-full group-active:scale-90 transition-transform ${timerValue > 0 ? "bg-yellow-400 text-black" : "bg-black/20"}`}><Timer size={26}/></div>
             <span className="text-[10px] font-bold">Retardateur</span>
           </button>

           <button onClick={() => setFlashEnabled(!flashEnabled)} className="flex flex-col items-center gap-1 group">
             <div className={`p-2.5 rounded-full group-active:scale-90 transition-transform ${flashEnabled ? "bg-yellow-400 text-black" : "bg-black/20"}`}>
               {flashEnabled ? <Zap size={26}/> : <ZapOff size={26}/>}
             </div>
             <span className="text-[10px] font-bold">Flash</span>
           </button>

           <button className="flex flex-col items-center gap-1 group">
             <div className="p-2.5 bg-black/20 rounded-full group-active:scale-90 transition-transform"><Layout size={26}/></div>
             <span className="text-[10px] font-bold">Montage</span>
           </button>

           <button onClick={() => setShowMoreIcons(!showMoreIcons)} className="flex flex-col items-center gap-1">
             <div className="p-2.5 bg-black/20 rounded-full">{showMoreIcons ? <ChevronUp size={26}/> : <ChevronDown size={26}/>}</div>
           </button>
        </div>
      </div>

      {/* Zone Basse */}
      <div className="mt-auto pb-10 z-20 bg-gradient-to-t from-black/80 to-transparent">
        {/* Sélecteur de durée */}
        <div className="flex justify-center gap-8 mb-8 overflow-x-auto no-scrollbar px-6">
          {["10 min", "60 s", "15 s", "Photo"].map(m => (
            <button 
              key={m} 
              onClick={() => setSelectedDuration(m)} 
              className={`text-[14px] font-black whitespace-nowrap transition-all ${selectedDuration === m ? "text-white scale-110" : "text-white/40"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Bouton Enregistrement & Effets */}
        <div className="flex items-center justify-around px-4">
          <button onClick={onOpenEffects} className="flex flex-col items-center gap-1 group">
            <div className="w-14 h-14 rounded-xl border-2 border-white/40 overflow-hidden bg-black/40 flex items-center justify-center group-active:scale-90 transition-transform">
              <Sparkles size={30} className="text-yellow-400"/>
            </div>
            <span className="text-[11px] font-bold">Effets</span>
          </button>

          <div className={`w-22 h-22 rounded-full border-[6px] ${isRecording ? 'border-red-500/30 scale-110' : 'border-white'} flex items-center justify-center p-2 transition-all duration-300`}>
            <button 
              onClick={handleCapture} 
              className={`w-full h-full bg-red-500 rounded-full shadow-lg active:scale-95 transition-all ${isRecording ? 'scale-60 rounded-xl' : ''}`} 
            />
          </div>

          <button className="flex flex-col items-center gap-1 group">
            <div className="w-14 h-14 rounded-xl border-2 border-white/40 overflow-hidden bg-black/40 flex items-center justify-center group-active:scale-90 transition-transform">
               <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 rounded-md flex items-center justify-center">
                 <ImageIcon size={20} className="text-white/50"/>
               </div>
            </div>
            <span className="text-[11px] font-bold">Téléverser</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraRecorder;
