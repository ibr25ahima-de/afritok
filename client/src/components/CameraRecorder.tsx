import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, Music, RotateCw, Zap, Timer, 
  Sparkles, ChevronDown, Wand2, Play, 
  ZapOff, Layout, Gauge, Film
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedDuration, setSelectedDuration] = useState("15 s");
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- MEDIAPIPE ---
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

  // --- CAMERA ---
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { exact: facingMode === "user" ? "user" : "environment" } }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (fallbackErr) {
        toast.error("Accès caméra refusé");
      }
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

  // --- HANDLERS ---
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
        }, 'image/jpeg');
      }
    } else if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(streamRef.current!);
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => { 
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (onVideoRecorded) onVideoRecorded(blob, recordingTime);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Video Preview */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover" 
      />
      <canvas ref={faceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* Header */}
      <div className="relative p-4 flex justify-between items-start z-20">
        <button onClick={onClose} className="p-2"><X size={28}/></button>
        
        <button 
          onClick={onOpenMusic} 
          className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold"
        >
          <Music size={16}/> 
          {selectedMusic?.name || "Ajouter un son"}
          {selectedMusic && <X size={14} className="ml-1 opacity-60"/>}
        </button>

        <div className="flex flex-col gap-4">
           <button onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")} className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/20 rounded-full"><RotateCw size={24}/></div>
           </button>
           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/20 rounded-full"><Gauge size={24}/></div>
             <span className="text-[10px] font-bold">Vitesse</span>
           </button>
           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/20 rounded-full"><Wand2 size={24}/></div>
             <span className="text-[10px] font-bold">Filtres</span>
           </button>
           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/20 rounded-full"><Timer size={24}/></div>
             <span className="text-[10px] font-bold">Retardateur</span>
           </button>
           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/20 rounded-full"><Layout size={24}/></div>
             <span className="text-[10px] font-bold">Montage</span>
           </button>
           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/20 rounded-full"><ChevronDown size={24}/></div>
           </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="mt-auto pb-8 z-20">
        {/* Duration Selector */}
        <div className="flex justify-center gap-6 mb-6 overflow-x-auto no-scrollbar px-4">
          {["10 min", "60 s", "15 s", "Photo"].map(m => (
            <button 
              key={m} 
              onClick={() => setSelectedDuration(m)} 
              className={`text-sm font-bold whitespace-nowrap px-4 py-1.5 rounded-full transition-all ${selectedDuration === m ? "bg-white text-black" : "text-white/60 bg-black/20"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Record Button & Effects */}
        <div className="flex items-center justify-between px-10">
          <button onClick={onOpenEffects} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-lg border-2 border-white/50 overflow-hidden bg-black/40 flex items-center justify-center">
              <Sparkles size={24} className="text-yellow-400"/>
            </div>
            <span className="text-[10px] font-bold">Effets</span>
          </button>

          <div className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-500/50' : 'border-white'} flex items-center justify-center p-1.5`}>
            <button 
              onClick={handleCapture} 
              className={`w-full h-full bg-red-500 rounded-full transition-all ${isRecording ? 'scale-75 rounded-lg' : ''}`} 
            />
          </div>

          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-lg border-2 border-white/50 overflow-hidden bg-black/40 flex items-center justify-center">
               <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-sm"/>
            </div>
            <span className="text-[10px] font-bold">Téléverser</span>
          </button>
        </div>
      </div>

      {/* Recording Progress Bar */}
      {isRecording && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-30">
          <div 
            className="h-full bg-yellow-400 transition-all duration-1000" 
            style={{ width: `${(recordingTime / (selectedDuration === "60 s" ? 60 : 15)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default CameraRecorder;
