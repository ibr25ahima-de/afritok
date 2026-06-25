import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, CheckCircle, X, RotateCw, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type Step = "capture" | "edit" | "publish";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  // States
  const [step, setStep] = useState<Step>("capture");
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedDuration, setSelectedDuration] = useState("15 s");
  const [timerDuration] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadMutation = trpc.video.upload.useMutation();

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
    if (step === "capture") {
      requestAnimationFrame(detectFace);
    }
  }, [step]);

  useEffect(() => {
    if (step === "capture") {
      const id = requestAnimationFrame(detectFace);
      return () => cancelAnimationFrame(id);
    }
  }, [step, detectFace]);

  // --- CAMERA ---
  const startCamera = useCallback(async () => {
    try {
      console.log("Attempting to start camera with facingMode:", facingMode);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { exact: facingMode === "user" ? "user" : "environment" } }, 
        audio: true 
      });
      console.log("Camera stream obtained.", stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
      console.error("Error accessing camera:", err);
      // Fallback if 'exact' fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (fallbackErr) {
        toast.error("Accès caméra refusé");
      }
    }
  }, [facingMode]);

  useEffect(() => { 
    if (step === "capture") {
      startCamera();
    } else {
      // Stop camera when not in capture step
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    }
  }, [step, startCamera]);

  // --- PREVIEW URL ---
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  // --- HANDLERS ---
  const handleCapture = () => {
    if (selectedDuration === "Photo") {
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx?.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob(b => { 
          if(b) { 
            setFile(new File([b], "img.jpg", {type:"image/jpeg"})); 
            setStep("edit"); 
          }
        });
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
          mr.onstop = () => { 
            setFile(new File([new Blob(chunks)], "vid.webm", {type:"video/webm"})); 
            setStep("edit"); 
          };
          mr.start(); mediaRecorderRef.current = mr; setIsRecording(true);
        } else setCountdown(c);
      }, 1000);
    }
  };

  const handlePublish = async () => {
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("userId", String(user.id));
      console.log("Attempting to upload file:", file);
      const res = await fetch("/api/upload-video", { method: "POST", body: fd });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed with status ${res.status}: ${errorText}`);
      }
      const data = await res.json();
      await uploadMutation.mutateAsync({ title: description.slice(0, 20) || "Post", videoUrl: data.videoUrl });
      setUploadSuccess(true); setTimeout(() => navigate("/feed"), 2000);
    } catch (e) { 
      console.error("Publication error:", e);
      toast.error("Erreur publication: " + (e as Error).message);
    } finally { setIsLoading(false); }
  };

  if (!isAuthenticated) return <div className="h-screen bg-black flex items-center justify-center text-white">Connexion requise</div>;
  if (uploadSuccess) return <div className="h-screen bg-black flex items-center justify-center text-white"><CheckCircle size={80} className="text-green-500"/></div>;

  // --- RENDER CAPTURE ---
  if (step === "capture") return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={faceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
      <canvas ref={canvasRef} className="hidden" />

      {countdown !== null && <div className="absolute inset-0 flex items-center justify-center z-50 text-9xl font-black">{countdown}</div>}

      <div className="relative p-4 flex justify-between z-20">
        <button onClick={() => navigate("/feed")}><X size={28}/></button>
        <div className="w-10"/>
      </div>

      <div className="absolute right-4 top-20 flex flex-col gap-4 z-20">
        <button onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")} className="flex flex-col items-center">
          <div className="p-2.5 bg-black/30 rounded-full"><RotateCw size={24}/></div>
          <span className="text-[10px] font-bold">Retourner</span>
        </button>
      </div>

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

  // --- RENDER EDIT ---
  if (step === "edit") return (
    <div className="h-screen bg-black text-white relative flex flex-col">
      <div className="absolute inset-0">
        {file?.type.startsWith("image/") ? (
          <img src={previewUrl!} className="w-full h-full object-cover" alt="preview" />
        ) : (
          <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />
        )}
      </div>
      <div className="relative p-4 flex justify-between z-10">
        <button onClick={() => { setFile(null); setStep("capture"); }}><ArrowLeft size={24}/></button>
        <button onClick={() => setStep("publish")} className="bg-red-500 px-8 py-2 rounded-full font-black">SUIVANT</button>
      </div>
    </div>
  );

  // --- RENDER PUBLISH ---
  return (
    <div className="h-screen bg-neutral-950 text-white flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center">
        <button onClick={() => setStep("edit")}><ArrowLeft size={24}/></button>
        <h1 className="flex-1 text-center font-black uppercase">Publier</h1>
      </div>
      <div className="flex-1 p-5 flex gap-5">
        <div className="w-32 aspect-[9/16] bg-neutral-900 rounded-xl overflow-hidden">
          {file?.type.startsWith("image/") ? (
            <img src={previewUrl!} className="w-full h-full object-cover" alt="preview" />
          ) : (
            <video src={previewUrl!} className="w-full h-full object-cover" />
          )}
        </div>
        <textarea 
          placeholder="Description..." 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          className="flex-1 bg-transparent resize-none focus:outline-none" 
        />
      </div>
      <div className="p-6 border-t border-white/5">
        <button 
          onClick={handlePublish} 
          disabled={isLoading} 
          className="w-full bg-red-500 py-4 rounded-2xl font-black uppercase disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin mx-auto"/> : "Publier"}
        </button>
      </div>
    </div>
  );
}
