import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, Music, RefreshCw, Zap, Timer, 
  Sparkles, ChevronDown, Wand2, 
  ZapOff, Layout, Gauge, ChevronUp,
  Maximize
} from 'lucide-react';
import { toast } from 'sonner';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { AudioPlayer } from "@/services/audioService";

interface CameraRecorderProps {
  onVideoRecorded?: (blob: Blob, duration: number) => void;
  onPhotoTaken?: (blob: Blob) => void;
  onClose?: () => void;
  onOpenMusic?: () => void;
  onOpenEffects?: () => void;
  selectedMusic?: { name: string; url: string } | null;
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
  const musicPlayerRef = useRef<AudioPlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicElementRef = useRef<HTMLAudioElement | null>(null);
  
  // States
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedDuration, setSelectedDuration] = useState("15 s");
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showMoreIcons, setShowMoreIcons] = useState(false);
  const [activeSpeed, setActiveSpeed] = useState("1x");
  const [timerValue, setTimerValue] = useState(0);

  // --- FLASH CONTROL ---
  const toggleFlash = async () => {
    const newFlashState = !flashEnabled;
    setFlashEnabled(newFlashState);
    
    const stream = streamRef.current;
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: newFlashState }]
          } as any);
        } catch (err) {
          console.error("Flash error:", err);
        }
      } else {
        toast.info("Le flash n'est pas supporté sur cet appareil");
      }
    }
  };

  // --- MUSIC SYNC ---
  useEffect(() => {
    if (!selectedMusic) {
      musicPlayerRef.current?.stop();
      return;
    }
    musicPlayerRef.current = new AudioPlayer(selectedMusic.url);
    return () => {
      musicPlayerRef.current?.stop();
    };
  }, [selectedMusic]);

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
      toast.error("Erreur caméra");
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

  // --- CAPTURE ---
  const handleCapture = async () => {
    if (selectedDuration === "PHOTO") {
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
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const destination = audioContext.createMediaStreamDestination();

      const micSource = audioContext.createMediaStreamSource(streamRef.current);
      micSource.connect(destination);

      let musicElement: HTMLAudioElement | null = null;

      if (selectedMusic) {
        musicElement = new Audio(selectedMusic.url);
        musicElement.crossOrigin = "anonymous";
        musicElementRef.current = musicElement;

        const musicSource = audioContext.createMediaElementSource(musicElement);
        musicSource.connect(destination);
        musicSource.connect(audioContext.destination);
      }

      const mixedStream = new MediaStream();

      streamRef.current
        .getVideoTracks()
        .forEach(track => mixedStream.addTrack(track));

      destination.stream
        .getAudioTracks()
        .forEach(track => mixedStream.addTrack(track));

      const chunks: Blob[] = [];
      const options = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? { mimeType: "video/webm;codecs=vp8,opus" }
        : { mimeType: "video/webm" };

      const mr = new MediaRecorder(mixedStream, options);
      
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => { 
        musicElementRef.current?.pause();
        audioContextRef.current?.close();
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (onVideoRecorded) onVideoRecorded(blob, recordingTime);
      };
      
      mr.start(1000);
      mediaRecorderRef.current = mr;
      
      if (musicElement) {
        await audioContext.resume();
        musicElement.currentTime = 0;
        musicElement.play();
      }
      
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
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={faceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {isRecording && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-30">
          <div 
            className="h-full bg-yellow-400 transition-all duration-100" 
            style={{ width: `${(recordingTime / (selectedDuration === "10 min" ? 600 : (selectedDuration === "60 s" ? 60 : 15))) * 100}%` }}
          />
        </div>
      )}

      {/* TOP BAR : X + Ajouter un son + Icônes droite */}
      <div className="relative p-4 flex justify-between items-start z-20">
        <button onClick={onClose} className="p-2 bg-black/10 rounded-full"><X size={28}/></button>
        
        <button onClick={onOpenMusic} className="bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold border border-white/10">
          <Music size={16}/> 
          <span className="max-w-[120px] truncate">{selectedMusic?.name || "Ajouter un son"}</span>
        </button>

        <div className="flex flex-col gap-5 items-center">
           <button onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")} className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10"><RefreshCw size={22}/></div>
             <span className="text-[10px] font-medium shadow-sm">Retourner</span>
           </button>
           
           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10"><Maximize size={22}/></div>
             <span className="text-[10px] font-medium shadow-sm">Format</span>
           </button>

           <button onClick={() => setActiveSpeed(s => s === "1x" ? "2x" : "1x")} className="flex flex-col items-center gap-1">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${activeSpeed !== "1x" ? "text-yellow-400" : ""}`}><Gauge size={22}/></div>
             <span className="text-[10px] font-medium shadow-sm">Vitesse</span>
           </button>

           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10"><Wand2 size={22}/></div>
             <span className="text-[10px] font-medium shadow-sm">Filtres</span>
           </button>

           <button onClick={() => setTimerValue(v => v === 0 ? 3 : 0)} className="flex flex-col items-center gap-1">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${timerValue > 0 ? "text-yellow-400" : ""}`}><Timer size={22}/></div>
             <span className="text-[10px] font-medium shadow-sm">Retardateur</span>
           </button>

           <button onClick={toggleFlash} className="flex flex-col items-center gap-1">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${flashEnabled ? "text-yellow-400" : ""}`}>
               {flashEnabled ? <Zap size={22} className="fill-yellow-400"/> : <ZapOff size={22}/>}
             </div>
             <span className="text-[10px] font-medium shadow-sm">Flash</span>
           </button>

           <button className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10"><Layout size={22}/></div>
             <span className="text-[10px] font-medium shadow-sm">Montage</span>
           </button>

           <button onClick={() => setShowMoreIcons(!showMoreIcons)} className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10">{showMoreIcons ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}</div>
           </button>
        </div>
      </div>

      {/* DUREES SCROLLABLES (10 min, 60 s, 15 s, PHOTO) */}
      <div className="absolute bottom-[60px] left-0 right-0 z-20">
        <div className="flex justify-center items-center gap-4 overflow-x-auto no-scrollbar px-4">
          {['10 min', '60 s', '15 s', 'PHOTO'].map((duration) => (
            <button
              key={duration}
              onClick={() => setSelectedDuration(duration)}
              className={`text-[15px] font-bold whitespace-nowrap transition-all ${
                selectedDuration === duration
                  ? 'text-white bg-white/15 px-3 py-1 rounded-full'
                  : 'text-white/70'
              }`}
            >
              {duration}
            </button>
          ))}
        </div>

        {/* Bouton d'enregistrement au centre */}
        <div className="flex justify-center mt-3">
          <div className={`w-20 h-20 rounded-full border-[5px] ${
            isRecording ? 'border-red-500/30 scale-110' : 'border-white'
          } flex items-center justify-center p-1.5 transition-all shadow-xl`}>
            <button
              onClick={handleCapture}
              className={`w-full h-full bg-red-500 rounded-full active:scale-95 transition-all ${
                isRecording ? 'scale-60 rounded-xl' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* BARRE NOIRE EN BAS : Avatar + PUBLIER + CRÉER */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-black h-[50px] flex items-center justify-between px-4">
        {/* Avatar miniature en bas à gauche */}
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
          <div className="w-full h-full bg-gradient-to-br from-yellow-500 via-red-500 to-purple-600" />
        </div>

        {/* PUBLIER et CRÉER en bas à droite */}
        <div className="flex items-center gap-5">
          <button className="text-[14px] font-bold text-white tracking-wide">PUBLIER</button>
          <button className="text-[14px] font-bold text-white tracking-wide">CRÉER</button>
        </div>
      </div>
    </div>
  );
};

export default CameraRecorder;
