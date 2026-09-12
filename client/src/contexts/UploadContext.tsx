import { createContext, useCallback, useContext, useEffect, useState } from "react";

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

  const setPreview = useCallback((url: string | null) => {
    setPreviewState(url);
  }, []);

  // Upload.tsx previously called video.load() from inside loadedmetadata.
  // load() resets the media element and starts a new load cycle; doing that
  // from the metadata event can repeatedly interrupt a freshly recorded blob.
  // Recorded previews are blob URLs, so the explicit reload is unnecessary.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prototype = HTMLMediaElement.prototype;
    const originalLoad = prototype.load;

    prototype.load = function afritokSafeLoad(this: HTMLMediaElement) {
      if (this.src.startsWith("blob:")) return;
      return originalLoad.call(this);
    };

    return () => {
      prototype.load = originalLoad;
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
