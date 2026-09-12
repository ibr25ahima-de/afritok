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

type AfriTokWindow = Window & { __afritokRecordedMime?: string };

function normalizeRecordedFile(file: File | null): File | null {
  if (!file || !file.type.startsWith("video/")) return file;
  if (typeof window === "undefined") return file;

  const recordedMime = (window as AfriTokWindow).__afritokRecordedMime;
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

  // Upload.tsx creates the recorded preview URL immediately after calling
  // setFile(), but currently labels that File as video/webm. If MediaRecorder
  // produced another container (for example MP4), fix only that one recorded
  // preview URL before it reaches the <video> element.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlApi = URL;
    const originalCreateObjectURL = urlApi.createObjectURL.bind(urlApi);

    urlApi.createObjectURL = (object: Blob | MediaSource) => {
      const recordedMime = (window as AfriTokWindow).__afritokRecordedMime;
      if (recordedMime && object instanceof Blob && object.type.startsWith("video/") && object.type !== recordedMime) {
        const corrected = new Blob([object], { type: recordedMime });
        (window as AfriTokWindow).__afritokRecordedMime = undefined;
        return originalCreateObjectURL(corrected);
      }
      return originalCreateObjectURL(object);
    };

    return () => {
      urlApi.createObjectURL = originalCreateObjectURL;
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
