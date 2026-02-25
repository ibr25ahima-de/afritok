import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Camera, Image, ChevronLeft, Crop, Music, Sparkles, Type } from "lucide-react";

export default function Upload() {
  const [, navigate] = useLocation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"initial" | "preview">("initial");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setStep("preview");
    }
  }, []);

  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleGalleryClick = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const handleBackToInitial = useCallback(() => {
    setSelectedFile(null);
    setVideoUrl(null);
    setStep("initial");
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const handleNext = useCallback(() => {
    // Ici, on simulerait l'envoi de la vidéo ou la navigation vers l'étape suivante
    // Pour l'instant, on retourne simplement au feed comme demandé pour l'UX TikTok
    navigate("/publish");
  }, [navigate]);

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="relative w-full p-4 flex justify-between items-center z-10">
        <button onClick={() => navigate("/feed")} className="p-2">
          <X size={24} />
        </button>
        <h1 className="text-lg font-semibold">Créer une vidéo</h1>
        <div className="w-8"></div> {/* Placeholder for alignment */}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative">
        {step === "initial" && (
          <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold mb-4">Ajouter une vidéo</h2>
            <button
              onClick={handleCameraClick}
              className="flex items-center justify-center gap-4 p-4 bg-gray-800 rounded-lg text-lg font-medium w-64"
            >
              <Camera size={24} />
              Caméra
            </button>
            <input
              type="file"
              accept="video/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={handleGalleryClick}
              className="flex items-center justify-center gap-4 p-4 bg-gray-800 rounded-lg text-lg font-medium w-64"
            >
              <Image size={24} />
              Galerie
            </button>
            <input
              type="file"
              accept="video/*"
              ref={galleryInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {step === "preview" && videoUrl && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              controls={false}
              loop
              autoPlay
              playsInline
            />

            {/* Overlay controls */}
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              {/* Top controls */}
              <div className="flex justify-between items-center">
                <button onClick={handleBackToInitial} className="p-2 bg-black/50 rounded-full">
                  <ChevronLeft size={24} />
                </button>
                <div className="flex gap-2">
                  <button className="p-2 bg-black/50 rounded-full"><Crop size={20} /></button>
                  <button className="p-2 bg-black/50 rounded-full"><Music size={20} /></button>
                  <button className="p-2 bg-black/50 rounded-full"><Sparkles size={20} /></button>
                  <button className="p-2 bg-black/50 rounded-full"><Type size={20} /></button>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-red-600 rounded-full text-lg font-semibold"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
