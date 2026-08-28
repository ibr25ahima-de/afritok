import { useEffect, useRef, useState } from "react";

type MediaKind = "image" | "video";

interface AdvertisingMediaPickerProps {
  kind: MediaKind;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function AdvertisingMediaPicker({
  kind,
  file,
  onChange,
}: AdvertisingMediaPickerProps) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = kind === "image" ? "image/*" : "video/*";
  const label = kind === "image" ? "photo" : "vidéo";

  const handleFile = (candidate?: File) => {
    if (!candidate) return;
    if (kind === "image" && !candidate.type.startsWith("image/")) return;
    if (kind === "video" && !candidate.type.startsWith("video/")) return;
    onChange(candidate);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          ref={libraryRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={accept}
          capture="environment"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-gray-300 p-4 font-bold"
        >
          📁 Choisir {label}
        </button>

        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-gray-300 p-4 font-bold"
        >
          📷 Prendre {label}
        </button>
      </div>

      {file && (
        <div className="rounded-xl border bg-gray-50 p-3">
          <p className="text-sm font-bold break-all">Fichier : {file.name}</p>
          {previewUrl && kind === "image" && (
            <img
              src={previewUrl}
              alt="Aperçu de la publicité"
              className="mt-3 max-h-56 w-full rounded-lg object-contain"
            />
          )}
          {previewUrl && kind === "video" && (
            <video
              src={previewUrl}
              controls
              playsInline
              className="mt-3 max-h-56 w-full rounded-lg"
            />
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-3 text-sm font-bold text-red-600"
          >
            Supprimer le fichier
          </button>
        </div>
      )}
    </div>
  );
}
