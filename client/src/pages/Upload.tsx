import { useRef } from "react";
import { useLocation } from "wouter";
import { useUpload } from "@/contexts/UploadContext";

export default function Upload() {
  const [, navigate] = useLocation();
  const { setFile, setPreview } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const previewUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setPreview(previewUrl);

    navigate("/publish");
  };

  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="bg-white text-black px-6 py-3 rounded-lg font-semibold"
      >
        Choisir une vidéo
      </button>
    </div>
  );
}
