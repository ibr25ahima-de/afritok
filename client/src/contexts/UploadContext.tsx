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

function normalizeRecordedFile(file: File | null): File | null {
  if (!file || !file.type.startsWith("video/")) return file;
  if (typeof window === "undefined") return file;

  const recordedMime = (window as Window & { __afritokRecordedMime?: string }).__afritokRecordedMime;
  if (!recordedMime || recordedMime === file.type) return file;

  const extension = recordedMime.startsWith("video/mp4") ? "mp4" : "webm";
  return new File([file], `video.${extension}`, {
    type: recordedMime,
    lastModified: file.lastModified || Date.now(),
  });
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [file, setFileState] = useState<File | null>(null);
  const [preview, setPreviewState] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const setFile = useCallback((nextFile: File | null) => {
    setFileState(normalizeRecordedFile(nextFile));
  }, []);

  const setPreview = useCallback((url: string | null) => {
    setPreviewState(url);
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
