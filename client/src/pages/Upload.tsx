import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUpload } from "@/contexts/UploadContext";
import { Camera, Upload, Play, Pause, X, Music, Type, Sparkles, Volume2, Scissors, Check } from "lucide-react";

export default function Upload() {
  const [, navigate] = useLocation();
  const { setFile, setPreview } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ================= STATE =================
  const [mode, setMode] = useState<"select" | "camera" | "edit" | "preview">("select");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Edit state
  const [speed, setSpeed] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [filter, setFilter] = useState<"none" | "beauty" | "warm" | "cool" | "grayscale">("none");
  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textPosition, setTextPosition] = useState(50);
  const [musicVolume, setMusicVolume] = useState(50);
  const [videoVolume, setVideoVolume] = useState(100);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ================= CAMERA RECORDING =================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setMode("camera");
    } catch (error) {
      console.error("Camera access denied:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) return;

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp8,opus",
    });

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      setMode("edit");

      // Stop camera stream
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setRecordingTime(0);

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // ================= GALLERY UPLOAD =================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setVideoBlob(selectedFile);
    const previewUrl = URL.createObjectURL(selectedFile);
    setVideoUrl(previewUrl);
    setMode("edit");
  };

  // ================= VIDEO METADATA =================
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setTrimEnd(videoRef.current.duration);
    }
  };

  // ================= PUBLISH =================
  const handlePublish = async () => {
    if (!videoBlob) return;

    setFile(videoBlob);
    setPreview(videoUrl);
    navigate("/publish");
  };

  // ================= RENDER: SELECT MODE =================
  if (mode === "select") {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-white text-3xl font-bold mb-4">Create Video</h1>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* RECORD BUTTON */}
        <button
          onClick={startCamera}
          className="w-full max-w-sm bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition transform hover:scale-105 shadow-lg"
        >
          <Camera size={32} />
          Record Video
        </button>

        {/* UPLOAD BUTTON */}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-sm bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition transform hover:scale-105 shadow-lg"
        >
          <Upload size={32} />
          Upload from Gallery
        </button>
      </div>
    );
  }

  // ================= RENDER: CAMERA MODE =================
  if (mode === "camera") {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center relative">
        {/* VIDEO PREVIEW */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* RECORDING TIMER */}
        {isRecording && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg animate-pulse">
            🔴 {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
          </div>
        )}

        {/* CONTROLS */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-6 items-center">
          {!isRecording ? (
            <>
              <button
                onClick={startRecording}
                className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition transform hover:scale-110 shadow-lg border-4 border-red-600"
              >
                <div className="w-14 h-14 bg-red-600 rounded-full" />
              </button>
              <button
                onClick={() => setMode("select")}
                className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition shadow-lg"
              >
                <X size={32} color="white" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={stopRecording}
                className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition transform hover:scale-110 shadow-lg border-4 border-red-600"
              >
                <div className="w-6 h-6 bg-white rounded" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ================= RENDER: EDIT MODE =================
  if (mode === "edit") {
    return (
      <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
        {/* VIDEO PREVIEW */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* PLAY/PAUSE BUTTON */}
          <button
            onClick={() => {
              if (videoRef.current) {
                if (videoRef.current.paused) {
                  videoRef.current.play();
                } else {
                  videoRef.current.pause();
                }
              }
            }}
            className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition"
          >
            {!isPlaying && <Play size={64} fill="white" className="opacity-70" />}
          </button>
        </div>

        {/* EDIT CONTROLS */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
          {/* SPEED CONTROL */}
          <div>
            <label className="block text-sm font-semibold mb-2">Speed: {speed}x</label>
            <div className="flex gap-2">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-4 py-2 rounded font-semibold transition ${
                    speed === s ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* BRIGHTNESS */}
          <div>
            <label className="block text-sm font-semibold mb-2">Brightness: {brightness}%</label>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* FILTERS */}
          <div>
            <label className="block text-sm font-semibold mb-2">Filter</label>
            <div className="grid grid-cols-3 gap-2">
              {(["none", "beauty", "warm", "cool", "grayscale"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded text-xs font-semibold transition ${
                    filter === f ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* TEXT OVERLAY */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Type size={18} /> Text Overlay
            </label>
            <input
              type="text"
              placeholder="Enter text..."
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded mb-2"
            />
            <div className="flex gap-2 mb-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={textPosition}
                onChange={(e) => setTextPosition(Number(e.target.value))}
                className="flex-1"
                placeholder="Position"
              />
            </div>
          </div>

          {/* VOLUME CONTROL */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Volume2 size={18} /> Volume
            </label>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Video: {videoVolume}%</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoVolume}
                  onChange={(e) => setVideoVolume(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400">Music: {musicVolume}%</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* TRIM */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Scissors size={18} /> Trim Video
            </label>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Start: {trimStart.toFixed(1)}s</p>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400">End: {trimEnd.toFixed(1)}s</p>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* MUSIC */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Music size={18} /> Add Music
            </label>
            <button className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold transition">
              Choose from Library
            </button>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 px-4 py-4 border-t border-gray-700">
          <button
            onClick={() => setMode("select")}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <X size={20} /> Cancel
          </button>
          <button
            onClick={() => setMode("preview")}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          >
            <Check size={20} /> Preview
          </button>
        </div>
      </div>
    );
  }

  // ================= RENDER: PREVIEW MODE =================
  if (mode === "preview") {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center">
        {/* VIDEO PREVIEW */}
        <div className="w-full max-w-sm aspect-video bg-black flex items-center justify-center rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            autoPlay
            loop
            className="w-full h-full object-cover"
          />
        </div>

        {/* PREVIEW INFO */}
        <div className="mt-6 text-white text-center">
          <p className="text-sm text-gray-400">Ready to publish?</p>
          <p className="text-xs text-gray-500 mt-1">Speed: {speed}x • Filter: {filter}</p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="fixed bottom-6 left-4 right-4 flex gap-3">
          <button
            onClick={() => setMode("edit")}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold transition"
          >
            Back
          </button>
          <button
            onClick={handlePublish}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold transition"
          >
            Publish
          </button>
        </div>
      </div>
    );
  }

  return null;
}
