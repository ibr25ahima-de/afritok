import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, CheckCircle, X, Music, RotateCw, Zap, Timer, 
  Smile, ChevronDown, Image as ImageIcon,
  Scissors, Type, Sticker, Volume2, Sparkles, ArrowLeft,
  Wand2, Play, ZapOff, Layout
} from "lucide-react";
import { toast } from "sonner";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// --- CONFIGURATION ---
const FILTERS = [
  { id: "normal", name: "Normal" },
  { id: "vibe", name: "Vibe" },
  { id: "warm", name: "Warm" },
  { id: "cold", name: "Cold" },
  { id: "cinema", name: "Cinéma" },
  { id: "bw", name: "N&B" }
];

const EFFECTS = [
  { id: "beauty", name: "Beauté", preview: "/effects/beauty.jpg" },
  { id: "portrait", name: "Portrait", preview: "/effects/portrait.jpg" },
  { id: "facezoom", name: "Face Zoom", preview: "/effects/zoom.jpg" },
  { id: "vhs", name: "VHS", preview: "/effects/vhs.jpg" },
  { id: "mirror", name: "Miroir", preview: "/effects/mirror.jpg" }
];

const MUSICS = [
  { id: 1, name: "Afrobeat Mix", artist: "Burna", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, name: "TikTok Viral", artist: "Unknown", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }
];

type Step = "capture" | "edit" | "publish";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  // States
  const [step, setStep] = useState<Step>("capture");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedDuration, setSelectedDuration] = useState("15 s");
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [activeEffect, setActiveEffect] = useState(EFFECTS[0]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(3);
  const [skinSmooth, setSkinSmooth] = useState(50);
  const [faceBright, setFaceBright] = useState(50);
  const [faceSlim, setFaceSlim] = useState(50);
  const [eyeEnhance, setEyeEnhance] = useState(50);
  const [activeDrawer, setActiveDrawer] = useState<"none" | "music" | "filters" | "effects" | "beauty">("none");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [overlayTexts, setOverlayTexts] = useState<{id: number, text: string}[]>([]);
  const [isAddingText, setIsAddingText] = useState(false);
  const [tempText, setTempText] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadMutation = trpc.video.upload.useMutation();

  // --- MEDIAPIPE ---
  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` },
        runningMode: "VIDEO", numFaces: 1
      });
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
    if (step === "capture") {
      const id = requestAnimationFrame(detectFace);
      return () => cancelAnimationFrame(id);
    }
  }, [step, detectFace]);

  // --- CAMERA ---
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { toast.error("Accès caméra refusé"); }
  }, [facingMode]);

  useEffect(() => { if (step === "capture") startCamera(); }, [step, startCamera]);

  // --- HANDLERS ---
  const handleCapture = () => {
    if (selectedDuration === "Photo") {
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx?.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob(b => { if(b) { setFile(new File([b], "img.jpg", {type:"image/jpeg"})); setStep("edit"); }});
      }
    } else if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      let c = timerDuration; setCountdown(c);
      const t = setInterval(() => {
        if (--c === 0) {
          clearInterval(t); setCountdown(null);
          const s = videoRef.current?.srcObject as MediaStream;
          const mr = new MediaRecorder(s);
          const chunks: Blob[] = [];
          mr.ondataavailable = e => chunks.push(e.data);
          mr.onstop = () => { setFile(new File([new Blob(chunks)], "vid.webm", {type:"video/webm"})); setStep("edit"); };
          mr.start(); mediaRecorderRef.current = mr; setIsRecording(true);
        } else setCountdown(c);
      }, 1000);
    }
  };

  useEffect(() => {
    if (file) { setPreviewUrl(URL.createObjectURL(file)); }
  }, [file]);

  const handlePublish = async () => {
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("userId", String(user.id));
      const res = await fetch("/api/upload-video", { method: "POST", body: fd });
      const data = await res.json();
      await uploadMutation.mutateAsync({ title: description.slice(0, 20) || "Post", videoUrl: data.videoUrl });
      setUploadSuccess(true); setTimeout(() => navigate("/feed"), 2000);
    } catch (e) { toast.error("Erreur publication"); } finally { setIsLoading(false); }
  };

  const Drawer = ({ title, children, onClose }: any) => (
    <div className="absolute inset-x-0 bottom-0 z-50 bg-neutral-900/95 p-6 rounded-t-3xl animate-in slide-in-from-bottom">
      <div className="flex justify-between mb-6"><h3 className="font-bold">{title}</h3><button onClick={onClose}><X size={20}/></button></div>
      {children}
    </div>
  );

  if (!isAuthenticated) return <div className="h-screen bg-black flex items-center justify-center text-white">Connexion requise</div>;
  if (uploadSuccess) return <div className="h-screen bg-black flex flex-center text-white"><CheckCircle size={80} className="text-green-500"/></div>;

  if (step === "capture") return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ filter: `brightness(${100+faceBright*0.2}%) contrast(${100+skinSmooth*0.1}%)` }} />
      <canvas ref={faceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
      <canvas ref={canvasRef} className="hidden" />
      <audio ref={audioRef} className="hidden" />

      {countdown !== null && <div className="absolute inset-0 flex items-center justify-center z-50 text-9xl font-black">{countdown}</div>}

      <div className="relative p-4 flex justify-between z-20">
        <button onClick={() => navigate("/feed")}><X size={28}/></button>
        <button onClick={() => setActiveDrawer("music")} className="bg-white/20 px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold">
          <Music size={16}/> {selectedMusic?.name || "Ajouter un son"}
        </button>
        <div className="w-10"/>
      </div>

      <div className="absolute right-4 top-20 flex flex-col gap-4 z-20">
        <button onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")} className="flex flex-col items-center"><div className="p-2.5 bg-black/30 rounded-full"><RotateCw size={24}/></div><span className="text-[10px] font-bold">Retourner</span></button>
        <button onClick={() => setFlashEnabled(!flashEnabled)} className="flex flex-col items-center"><div className="p-2.5 bg-black/30 rounded-full"><Zap size={24} className={flashEnabled ? "text-yellow-400" : ""}/></div><span className="text-[10px] font-bold">Flash</span></button>
        <button onClick={() => setActiveDrawer("beauty")} className="flex flex-col items-center"><div className="p-2.5 bg-black/30 rounded-full"><Wand2 size={24}/></div><span className="text-[10px] font-bold">Beauté</span></button>
        <button onClick={() => setActiveDrawer("filters")} className="flex flex-col items-center"><div className="p-2.5 bg-black/30 rounded-full"><Sparkles size={24}/></div><span className="text-[10px] font-bold">Filtres</span></button>
      </div>

      {activeDrawer === "beauty" && (
        <Drawer title="Beauté" onClose={() => setActiveDrawer("none")}>
          <div className="space-y-4">
            {[{l:"Lissage",v:skinSmooth,s:setSkinSmooth},{l:"Éclat",v:faceBright,s:setFaceBright},{l:"Affiner",v:faceSlim,s:setFaceSlim}].map(i=>(
              <div key={i.l} className="space-y-1"><div className="flex justify-between text-xs font-bold"><span>{i.l}</span><span>{i.v}%</span></div>
              <input type="range" value={i.v} onChange={e=>i.s(Number(e.target.value))} className="w-full accent-red-500" /></div>
            ))}
          </div>
        </Drawer>
      )}

      <div className="mt-auto pb-10 z-20 bg-gradient-to-t from-black/60">
        <div className="flex justify-center gap-6 mb-8">
          {["15 s", "60 s", "Photo"].map(m => (
            <button key={m} onClick={() => setSelectedDuration(m)} className={`text-sm font-black px-4 py-1 rounded-full ${selectedDuration === m ? "bg-white text-black" : "text-white/50"}`}>{m}</button>
          ))}
        </div>
        <div className="flex items-center justify-center">
          <div className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-500' : 'border-white'} flex items-center justify-center p-1.5`}>
            <button onClick={handleCapture} className={`w-full h-full bg-red-500 rounded-full transition-all ${isRecording ? 'scale-75 rounded-lg' : ''}`} />
          </div>
        </div>
      </div>
    </div>
  );

  if (step === "edit") return (
    <div className="h-screen bg-black text-white relative flex flex-col">
      <div className="absolute inset-0">
        {file?.type.startsWith("image/") ? <img src={previewUrl!} className="w-full h-full object-cover" /> : <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />}
      </div>
      <div className="relative p-4 flex justify-between z-10">
        <button onClick={() => setStep("capture")}><ArrowLeft size={24}/></button>
        <button onClick={() => setStep("publish")} className="bg-red-500 px-8 py-2 rounded-full font-black">SUIVANT</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-neutral-950 text-white flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center"><button onClick={() => setStep("edit")}><ArrowLeft size={24}/></button><h1 className="flex-1 text-center font-black uppercase">Publier</h1></div>
      <div className="flex-1 p-5 flex gap-5">
        <div className="w-32 aspect-[9/16] bg-neutral-900 rounded-xl overflow-hidden">
          {file?.type.startsWith("image/") ? <img src={previewUrl!} className="w-full h-full object-cover" /> : <video src={previewUrl!} className="w-full h-full object-cover" />}
        </div>
        <textarea placeholder="Description..." value={description} onChange={e=>setDescription(e.target.value)} className="flex-1 bg-transparent resize-none focus:outline-none" />
      </div>
      <div className="p-6 border-t border-white/5"><button onClick={handlePublish} disabled={isLoading} className="w-full bg-red-500 py-4 rounded-2xl font-black uppercase disabled:opacity-50">{isLoading ? <Loader2 className="animate-spin mx-auto"/> : "Publier"}</button></div>
    </div>
  );
}
