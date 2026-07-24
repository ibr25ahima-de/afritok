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
import { FilterLibrary, Filter } from './FilterLibrary';
import { EffectsLibrary, Effect } from './EffectsLibrary';

interface CameraRecorderProps {
  onVideoRecorded?: (blob: Blob, duration: number) => void;
  onPhotoTaken?: (blob: Blob) => void;
  onClose?: () => void;
  onOpenMusic?: () => void;
  onOpenEffects?: () => void;
  onPublish?: () => void;
  selectedMusic?: { name: string; url: string } | null;
}

// Ratios de format disponibles
const FORMAT_RATIOS = [
  { id: '9:16', label: '9:16', width: 9, height: 16 },
  { id: '1:1', label: '1:1', width: 1, height: 1 },
  { id: '16:9', label: '16:9', width: 16, height: 9 },
];

// Filtres rapides pour preview temps réel (basés sur FilterLibrary)
const QUICK_FILTERS: { id: string; name: string; cssFilter: string }[] = [
  { id: 'none', name: 'Normal', cssFilter: 'none' },
  { id: 'beauty-smooth', name: 'Smooth', cssFilter: 'blur(0.5px) brightness(1.05)' },
  { id: 'beauty-glow', name: 'Glow', cssFilter: 'brightness(1.1) saturate(1.2)' },
  { id: 'color-vivid', name: 'Vivid', cssFilter: 'saturate(1.5) contrast(1.1)' },
  { id: 'color-warm', name: 'Warm', cssFilter: 'hue-rotate(-30deg) saturate(1.3)' },
  { id: 'color-cool', name: 'Cool', cssFilter: 'hue-rotate(180deg) saturate(1.2)' },
  { id: 'color-neon', name: 'Neon', cssFilter: 'saturate(2) contrast(1.3) brightness(1.1)' },
  { id: 'vintage-sepia', name: 'Sepia', cssFilter: 'sepia(0.8) saturate(1.2)' },
  { id: 'vintage-film', name: 'Film', cssFilter: 'contrast(1.2) saturate(0.8) brightness(0.95)' },
  { id: 'mood-cinematic', name: 'Cinéma', cssFilter: 'contrast(1.2) saturate(0.9) brightness(1.05)' },
  { id: 'mood-dramatic', name: 'Dramatic', cssFilter: 'contrast(1.4) brightness(0.9) saturate(1.1)' },
  { id: 'mood-dreamy', name: 'Dreamy', cssFilter: 'brightness(1.2) saturate(0.8) blur(0.3px)' },
  { id: 'special-bw', name: 'B&W', cssFilter: 'grayscale(1)' },
  { id: 'special-hdr', name: 'HDR', cssFilter: 'contrast(1.3) saturate(1.2) brightness(1.1)' },
];

// Vitesses disponibles
const SPEED_OPTIONS = ['0.5x', '1x', '1.5x', '2x'];

export const CameraRecorder: React.FC<CameraRecorderProps> = ({
  onVideoRecorded,
  onPhotoTaken,
  onClose,
  onOpenMusic,
  onOpenEffects,
  onPublish,
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
  const [timerCountdown, setTimerCountdown] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Format state
  const [selectedFormat, setSelectedFormat] = useState("9:16");
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<{ id: string; cssFilter: string } | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showFilterLibrary, setShowFilterLibrary] = useState(false);

  // Effects state
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);

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

  // --- FORMAT CONTROL ---
  const handleFormatSelect = (formatId: string) => {
    setSelectedFormat(formatId);
    setShowFormatMenu(false);
    toast.info(`Format ${formatId} sélectionné`);
  };

  const getFormatOverlayStyle = (): React.CSSProperties => {
    const ratio = FORMAT_RATIOS.find(r => r.id === selectedFormat);
    if (!ratio || ratio.id === '9:16') return {}; // 9:16 = plein écran
    
    if (ratio.id === '1:1') {
      return {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        zIndex: 5,
      };
    }
    if (ratio.id === '16:9') {
      return {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        zIndex: 5,
      };
    }
    return {};
  };

  const getVideoWrapperStyle = (): React.CSSProperties => {
    const ratio = FORMAT_RATIOS.find(r => r.id === selectedFormat);
    if (!ratio || ratio.id === '9:16') return {};
    
    if (ratio.id === '1:1') {
      return { width: '100vh', height: '100vh', maxWidth: '100vw', maxHeight: '100vw' };
    }
    if (ratio.id === '16:9') {
      return { width: '100vw', height: 'auto', maxHeight: '56.25vw' };
    }
    return {};
  };

  // --- FILTER CONTROL ---
  const handleFilterSelect = (filter: Filter) => {
    setActiveFilter({ id: filter.id, cssFilter: filter.cssFilter || 'none' });
    toast.info(`Filtre "${filter.name}" appliqué`);
  };

  const handleQuickFilterSelect = (filter: { id: string; name: string; cssFilter: string }) => {
    if (filter.id === 'none') {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
  };

  // --- EFFECTS CONTROL ---
  const handleEffectSelect = (effect: Effect) => {
    setSelectedEffects(prev => {
      if (prev.includes(effect.id)) {
        return prev.filter(id => id !== effect.id);
      }
      return [...prev, effect.id];
    });
  };

  const getEffectsOverlayClass = (): string => {
    const classes: string[] = [];
    if (selectedEffects.includes('part-confetti')) classes.push('animate-confetti');
    if (selectedEffects.includes('part-snow')) classes.push('animate-snow');
    if (selectedEffects.includes('part-hearts')) classes.push('animate-hearts');
    if (selectedEffects.includes('part-sparkles')) classes.push('animate-sparkles');
    if (selectedEffects.includes('over-scanlines')) classes.push('animate-scanlines');
    if (selectedEffects.includes('over-noise')) classes.push('animate-noise');
    if (selectedEffects.includes('over-bloom')) classes.push('animate-bloom');
    if (selectedEffects.includes('over-vignette')) classes.push('animate-vignette');
    return classes.join(' ');
  };

  // --- TIMER CONTROL ---
  const startTimer = useCallback((duration: number): Promise<void> => {
    return new Promise((resolve) => {
      setIsTimerActive(true);
      setTimerCountdown(duration);
      let remaining = duration;
      
      const interval = setInterval(() => {
        remaining--;
        setTimerCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          setIsTimerActive(false);
          resolve();
        }
      }, 1000);
    });
  }, []);

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
    // Si le retardateur est activé, lancer le countdown
    if (timerValue > 0 && !isRecording) {
      setIsTimerActive(true);
      await startTimer(timerValue);
      setIsTimerActive(false);
      // Continuer avec la capture après le countdown
    }

    if (selectedDuration === "PHOTO") {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        
        // Appliquer le filtre actif au canvas avant de capturer
        if (ctx && activeFilter) {
          ctx.filter = activeFilter.cssFilter;
        }
        
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          ctx.filter = 'none';
        }
        
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
        // Appliquer la vitesse de lecture à la musique
        const speedMultiplier = parseFloat(activeSpeed.replace('x', ''));
        musicElement.playbackRate = speedMultiplier;
        musicElement.play();
      }
      
      // Appliquer la vitesse au flux vidéo
      const speedMultiplier = parseFloat(activeSpeed.replace('x', ''));
      if (videoRef.current) {
        videoRef.current.playbackRate = speedMultiplier;
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

  // Vérifier si la durée maximale est atteinte
  useEffect(() => {
    if (isRecording) {
      const maxSeconds = selectedDuration === "10 min" ? 600 : selectedDuration === "60 s" ? 60 : 15;
      if (recordingTime >= maxSeconds) {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }
    }
  }, [recordingTime, isRecording, selectedDuration]);

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: activeFilter?.cssFilter || 'none',
          ...getVideoWrapperStyle(),
        }}
      />
      <canvas ref={faceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

      {/* Overlay format */}
      {selectedFormat !== '9:16' && (
        <div className="absolute inset-0 pointer-events-none z-5" style={getFormatOverlayStyle()}>
          <div style={getVideoWrapperStyle()} className="relative overflow-hidden">
            {/* Le format overlay crée des bandes noires */}
          </div>
        </div>
      )}

      {/* Overlay effets de particules/animation */}
      {selectedEffects.length > 0 && (
        <div className={`absolute inset-0 pointer-events-none z-15 ${getEffectsOverlayClass()}`}>
          {/* Les effets CSS seront appliqués via les classes */}
          {selectedEffects.includes('over-vignette') && (
            <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/50" />
          )}
          {selectedEffects.includes('over-scanlines') && (
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
            }} />
          )}
          {selectedEffects.includes('over-noise') && (
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
            }} />
          )}
        </div>
      )}

      {isRecording && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-30">
          <div 
            className="h-full bg-yellow-400 transition-all duration-100" 
            style={{ width: `${(recordingTime / (selectedDuration === "10 min" ? 600 : (selectedDuration === "60 s" ? 60 : 15))) * 100}%` }}
          />
        </div>
      )}

      {/* Countdown Timer Overlay */}
      {isTimerActive && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40">
          <div className="text-8xl font-bold text-white animate-pulse">{timerCountdown}</div>
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
           
           {/* FORMAT - Avec menu déroulant */}
           <button onClick={() => setShowFormatMenu(!showFormatMenu)} className="flex flex-col items-center gap-1 relative">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${selectedFormat !== '9:16' ? 'text-yellow-400' : ''}`}>
               <Maximize size={22}/>
             </div>
             <span className="text-[10px] font-medium shadow-sm">Format</span>
             {showFormatMenu && (
               <div className="absolute right-full mr-3 top-0 bg-black/90 backdrop-blur-lg rounded-xl border border-white/10 p-2 flex flex-col gap-2 min-w-[120px]">
                 {FORMAT_RATIOS.map(ratio => (
                   <button
                     key={ratio.id}
                     onClick={() => handleFormatSelect(ratio.id)}
                     className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                       selectedFormat === ratio.id 
                         ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50' 
                         : 'text-white hover:bg-white/10'
                     }`}
                   >
                     {ratio.label}
                   </button>
                 ))}
               </div>
             )}
           </button>

           {/* VITESSE - Avec sélecteur */}
           <button onClick={() => {
             const currentIndex = SPEED_OPTIONS.indexOf(activeSpeed);
             const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
             setActiveSpeed(SPEED_OPTIONS[nextIndex]);
             if (videoRef.current) {
               videoRef.current.playbackRate = parseFloat(SPEED_OPTIONS[nextIndex].replace('x', ''));
             }
           }} className="flex flex-col items-center gap-1">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${activeSpeed !== "1x" ? "text-yellow-400" : ""}`}>
               <Gauge size={22}/>
             </div>
             <span className="text-[10px] font-medium shadow-sm">{activeSpeed}</span>
           </button>

           {/* FILTRES - Ouvre le panneau */}
           <button onClick={() => setShowFilterPanel(true)} className="flex flex-col items-center gap-1">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${activeFilter ? "text-yellow-400" : ""}`}>
               <Wand2 size={22}/>
             </div>
             <span className="text-[10px] font-medium shadow-sm">Filtres</span>
           </button>

           {/* RETARDATEUR - Avec sélecteur de temps */}
           <button onClick={() => {
             if (timerValue === 0) {
               setTimerValue(3);
               toast.info("Retardateur activé: 3 secondes");
             } else if (timerValue === 3) {
               setTimerValue(5);
               toast.info("Retardateur activé: 5 secondes");
             } else {
               setTimerValue(10);
               toast.info("Retardateur activé: 10 secondes");
             }
           }} className="flex flex-col items-center gap-1">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${timerValue > 0 ? "text-yellow-400" : ""}`}>
               <Timer size={22}/>
             </div>
             <span className="text-[10px] font-medium shadow-sm">{timerValue > 0 ? `${timerValue}s` : 'Retardateur'}</span>
           </button>

           <button onClick={toggleFlash} className="flex flex-col items-center gap-1">
             <div className={`p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10 ${flashEnabled ? "text-yellow-400" : ""}`}>
               {flashEnabled ? <Zap size={22} className="fill-yellow-400"/> : <ZapOff size={22}/>}
             </div>
             <span className="text-[10px] font-medium shadow-sm">Flash</span>
           </button>

           {/* MONTAGE - Ouvre VideoEditor */}
           <button onClick={() => toast.info("Enregistrez d'abord une vidéo pour accéder au montage")} className="flex flex-col items-center gap-1">
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
          <button 
            onClick={() => {
              // Naviguer vers l'étape edit puis publish
              if (onPublish) {
                onPublish();
              }
            }} 
            className="text-[14px] font-bold text-white tracking-wide hover:text-yellow-400 transition-colors"
          >
            PUBLIER
          </button>
          <button 
            onClick={() => {
              // Ouvrir le sélecteur AudioSelector pour créer
              if (onOpenMusic) {
                onOpenMusic();
              }
            }} 
            className="text-[14px] font-bold text-white tracking-wide hover:text-yellow-400 transition-colors"
          >
            CRÉER
          </button>
        </div>
      </div>

      {/* PANNEAU FILTRES RAPIDES (bas de l'écran, swipe horizontal) */}
      {showFilterPanel && (
        <div className="absolute bottom-[130px] left-0 right-0 z-30 bg-black/80 backdrop-blur-lg rounded-t-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Filtres rapides</h3>
            <button onClick={() => setShowFilterPanel(false)} className="text-xs text-gray-400">Fermer</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {QUICK_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => handleQuickFilterSelect(filter)}
                className={`flex flex-col items-center gap-1 min-w-[64px] ${
                  activeFilter?.id === filter.id ? 'opacity-100' : 'opacity-70'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-lg overflow-hidden border-2 transition-all"
                  style={{
                    filter: filter.cssFilter,
                    borderColor: activeFilter?.id === filter.id ? '#facc15' : 'transparent',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                />
                <span className="text-[10px] font-medium">{filter.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowFilterPanel(false); setShowFilterLibrary(true); }}
            className="w-full mt-3 py-2 bg-white/10 rounded-full text-xs font-bold border border-white/10"
          >
            Voir tous les filtres
          </button>
        </div>
      )}

      {/* BIBLIOTHÈQUE DE FILTRES COMPLÈTE */}
      {showFilterLibrary && (
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg rounded-t-2xl max-h-[60vh] overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Tous les filtres</h3>
            <button onClick={() => setShowFilterLibrary(false)} className="text-xs text-gray-400">Fermer</button>
          </div>
          <FilterLibrary
            onFilterSelect={handleFilterSelect}
            selectedFilters={activeFilter ? [activeFilter.id] : []}
            onFilterRemove={() => setActiveFilter(null)}
          />
        </div>
      )}

      {/* BIBLIOTHÈQUE D'EFFETS */}
      {showEffectsPanel && (
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg rounded-t-2xl max-h-[60vh] overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Effets</h3>
            <button onClick={() => setShowEffectsPanel(false)} className="text-xs text-gray-400">Fermer</button>
          </div>
          <EffectsLibrary
            onEffectSelect={handleEffectSelect}
            selectedEffects={selectedEffects}
            onEffectRemove={(id) => setSelectedEffects(prev => prev.filter(e => e !== id))}
          />
        </div>
      )}
    </div>
  );
};

export default CameraRecorder;
