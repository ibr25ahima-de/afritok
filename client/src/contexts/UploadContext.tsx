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
  // Mobile browsers can render the new edit <video> a little later than the
  // React state update. Keep retrying briefly so we reload the actual element
  // after it exists, instead of relying on a single animation-frame timing.
  const setPreview = useCallback((url: string | null) => {
    setPreviewState(url);
    if (!url || typeof window === "undefined") return;

    let attempts = 0;
    let timer: number | undefined;

    const reloadMatchingVideo = () => {
      const videos = document.querySelectorAll<HTMLVideoElement>("video");
      let found = false;

      videos.forEach((video) => {
        const source = video.getAttribute("src");
        if (source !== url && video.currentSrc !== url) return;

        found = true;
        video.playsInline = true;
        video.muted = true;
        video.preload = "auto";

        const startPlayback = () => {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            void video.play().catch(() => {});
          }
        };

        video.addEventListener("loadedmetadata", startPlayback, { once: true });
        video.addEventListener("canplay", startPlayback, { once: true });
        video.load();
        startPlayback();
      });

      attempts += 1;
      if (!found && attempts < 20) {
        timer = window.setTimeout(reloadMatchingVideo, 100);
      }
    };

    window.requestAnimationFrame(reloadMatchingVideo);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
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
