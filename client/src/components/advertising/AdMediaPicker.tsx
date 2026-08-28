import { useRef, useState } from "react";

type MediaType = "image" | "video";

interface AdMediaPickerProps {
  type: MediaType;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function AdMediaPicker({ type, file, onChange }: AdMediaPickerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const choose = (nextFile?: File) => {
    if (!nextFile) return;
    const valid = type === "image"
      ? nextFile.type.startsWith("image/")
      : nextFile.type.startsWith("video/");

    if (!valid) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(nextFile));
    onChange(nextFile);
  };

  const accept = type === "image" ? "image/*" : "video/*";
  const label = type === "image" ? "photo" : "vidéo";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          ref={galleryRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={accept}
          capture={type === "image" ? "environment" : "environment"}
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="rounded-2xl border-2 border-gray-200 p-4 font-black active:scale-95"
        >
          📁 Choisir {label}
        </button>

        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 font-black active:scale-95"
        >
          {type === "image" ? "📷 Prendre une photo" : "🎥 Prendre une vidéo"}
        </button>
      </div>

      {file && (
        <div className="rounded-2xl border bg-gray-50 p-3">
          <p className="mb-2 text-sm font-bold">Fichier sélectionné : {file.name}</p>
          {previewUrl && type === "image" && (
            <img src={previewUrl} alt="Aperçu de la publicité" className="max-h-64 w-full rounded-xl object-contain" />
          )}
          {previewUrl && type === "video" && (
            <video src={previewUrl} controls playsInline className="max-h-64 w-full rounded-xl object-contain" />
          )}
          <button
            type="button"
            onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              onChange(null);
            }}
            className="mt-2 text-sm font-bold text-red-600"
          >
            Supprimer et choisir un autre fichier
          </button>
        </div>
      )}
    </div>
  );
}
