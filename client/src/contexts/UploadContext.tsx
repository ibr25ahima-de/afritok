import { createContext, useCallback, useContext, useState } from "react";

type UploadContextType = {
  file: File | null;
  setFile: (file: File | null) => void;
  preview: string | null;
  setPreview: (url: string | null) => void;
  selectedMusic: {
    url: string;
    name: string;
  } | null;
  setSelectedMusic: (
    music: {
      url: string;
      name: string;
    } | null
  ) => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreviewState] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<{
    url: string;
    name: string;
  } | null>(null);

  // A recorded Blob is handed to the edit screen through a blob URL.
  // On mobile browsers, changing the <video> src during the React transition
  // can leave the media element stuck on an empty/black frame. Force a fresh
  // media load after React has committed the new src.
  const setPreview = useCallback((url: string | null) => {
    setPreviewState(url);
    if (!url || typeof window === "undefined") return;

    const reloadMatchingVideo = () => {
      const videos = document.querySelectorAll<HTMLVideoElement>("video");
      videos.forEach((video) => {
        const source = video.getAttribute("src");
        if (source !== url && video.currentSrc !== url) return;

        video.playsInline = true;
        video.muted = true;
        video.preload = "auto";
        video.load();
        void video.play().catch(() => {
          // Autoplay can be blocked; the video is still loaded and can be
          // started by the user's next interaction.
        });
      });
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(reloadMatchingVideo);
    });
  }, []);

  return (
    <UploadContext.Provider
      value={{
        file,
        setFile,
        preview,
        setPreview,
        selectedMusic,
        setSelectedMusic,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used inside UploadProvider");
  }
  return context;
}
