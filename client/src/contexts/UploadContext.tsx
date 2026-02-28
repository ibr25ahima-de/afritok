import { createContext, useContext, useState } from "react";

type UploadContextType = {
  file: File | null;
  setFile: (file: File | null) => void;
  preview: string | null;
  setPreview: (url: string | null) => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <UploadContext.Provider value={{ file, setFile, preview, setPreview }}>
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
