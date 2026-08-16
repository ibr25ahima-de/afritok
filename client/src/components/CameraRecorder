import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, Music, RefreshCw, Zap, Timer, 
  Sparkles, Gauge
} from 'lucide-react';
import { toast } from 'sonner';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { AudioPlayer } from "@/services/audioService";
import { EffectsPanel, AREffect } from './EffectsPanel';
import { AREngine } from './AREngine';

interface CameraRecorderProps {
  onVideoRecorded?: (blob: Blob, duration: number) => void;
  onPhotoTaken?: (blob: Blob) => void;
  onClose?: () => void;
  onOpenMusic?: () => void;
  onOpenEffects?: () => void;
  onPublish?: () => void;
  selectedMusic?: { name: string; url: string } | null;
}



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

  const [activeSpeed, setActiveSpeed] = useState("1x");
  const [timerValue, setTimerValue] = useState(0);
  const [timerCountdown, setTimerCountdown] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);





  // AR Effects state (Nouveau - Effets TikTok-style)
  const [activeAREffect, setActiveAREffect] = useState<AREffect | null>(null);
  const [showAREffectsPanel, setShowAREffectsPanel] = useState(false);

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





  // --- AR EFFECTS CONTROL ---
  const handleAREffectSelect = (effect: AREffect | null) => {
    setActiveAREffect(effect);
    setShowAREffectsPanel(false);

    if (effect) {
      toast.info(`Effet AR "${effect.name}" activé`);
    }
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

  // --- MEDIAPIPE (pour la détection faciale de base) ---
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
    }

    if (selectedDuration === "PHOTO") {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
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
      {/* Flux vidéo */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />
      

      {/* AREngine - Effets AR en temps réel sur le visage */}
      <AREngine 
        videoRef={videoRef}
        activeEffect={activeAREffect}

        isRecording={isRecording}
      />





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
           


           {/* VITESSE */}
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



           {/* RETARDATEUR */}
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

           {/* MONTAGE */}
           <button onClick={() => toast.info("Enregistrez d'abord une vidéo pour accéder au montage")} className="flex flex-col items-center gap-1">
             <div className="p-2 bg-black/30 backdrop-blur-lg rounded-full border border-white/10"><Layout size={22}/></div>
             <span className="text-[10px] font-medium shadow-sm">Montage</span>
           </button>


        </div>
      </div>

      {/* DUREES SCROLLABLES (10 min, 60 s, 15 s, PHOTO) */}
      <div className={`absolute left-0 right-0 z-20 transition-all duration-300 ${showAREffectsPanel ? 'bottom-[280px]' : 'bottom-[60px]'}`}>
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

      {/* PANNEAU EFFETS AR (TikTok-style - affiché seulement quand showAREffectsPanel est true) */}
      {showAREffectsPanel && (
        <div className="absolute bottom-[50px] left-0 right-0 z-40 transition-all duration-300">
          <EffectsPanel
            selectedEffect={activeAREffect}
            onSelectEffect={handleAREffectSelect}
          />
        </div>
      )}

      {/* BARRE NOIRE EN BAS : Avatar + Effets + PUBLIER + CRÉER */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-black flex items-center px-4 h-[50px]">
        {/* Avatar miniature en bas à gauche */}
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
          <div className="w-full h-full bg-gradient-to-br from-yellow-500 via-red-500 to-purple-600" />
        </div>

        {/* Bouton EFFETS au centre (toujours jaune comme TikTok) */}
        <button 
          onClick={() => setShowAREffectsPanel(!showAREffectsPanel)}
          className={`flex-1 mx-4 py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            showAREffectsPanel 
              ? 'bg-yellow-400 text-black' 
              : 'bg-white/10 text-white border border-white/10'
          }`}
        >
          <Palette size={16} />
          <span>Effets</span>
          {activeAREffect && !showAREffectsPanel && (
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
          )}
        </button>

        {/* PUBLIER et CRÉER en bas à droite */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (onPublish) onPublish();
            }} 
            className="text-[13px] font-bold text-white tracking-wide hover:text-yellow-400 transition-colors"
          >
            PUBLIER
          </button>
          <button 
            onClick={() => {
              if (onOpenMusic) onOpenMusic();
            }} 
            className="text-[13px] font-bold text-white tracking-wide hover:text-yellow-400 transition-colors"
          >
            CRÉER
          </button>
        </div>
      </div>






    </div>
  );
};

export default CameraRecorder;
