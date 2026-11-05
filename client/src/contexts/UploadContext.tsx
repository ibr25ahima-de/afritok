import { createContext, useCallback, useContext, useEffect, useState } from "react";

type UploadContextType = {
  file: File | null;
  setFile: (file: File | null) => void;
  preview: string | null;
  setPreview: (url: string | null) => void;
  selectedMusic: {
    url: string;
    name: string;
    id?: string;
  } | null;
  setSelectedMusic: (
    music: {
      url: string;
      name: string;
      id?: string;
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
    id?: string;
  } | null>(null);

  const setPreview = useCallback((url: string | null) => {
    setPreviewState(url);
  }, []);

  // Ne pas remplacer HTMLMediaElement.prototype.load globalement :
  // les vidéos choisies dans la galerie utilisent des URL blob et doivent
  // pouvoir être chargées normalement par le navigateur.

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
