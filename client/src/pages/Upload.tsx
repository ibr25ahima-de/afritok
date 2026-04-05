import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <p>Veuillez vous connecter</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || !user) return;

    setIsLoading(true);

    try {
      // ✅ 1. Upload vers backend (multer + supabase)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", String(user.id));

      const res = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload échoué");
      }

      const data = await res.json();
      const videoUrl = data.videoUrl;

      // ✅ 2. Créer la vidéo via API (SANS fichier)
      await fetch("/api/trpc/video.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title || file.name,
          description: description || null,
          videoUrl: videoUrl,
        }),
      });

      // Reset + redirect
      setFile(null);
      setTitle("");
      setDescription("");
      navigate("/feed");

    } catch (error) {
      console.error("Upload failed:", error);
      alert("Erreur lors de l'upload");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      {!file ? (
        <div className="text-center">
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            disabled={isLoading}
          >
            Choisir une vidéo
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
          {previewUrl && (
            <div className="w-full bg-black rounded-lg overflow-hidden">
              <video
                src={previewUrl}
                controls
                className="w-full h-96 object-cover bg-black"
              />
            </div>
          )}
          
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Titre</label>
              <input
                type="text"
                placeholder="Titre de ta vidéo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                placeholder="Décris ta vidéo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg h-20"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFile(null);
                  setTitle("");
                  setDescription("");
                }}
                disabled={isLoading}
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Upload...
                  </>
                ) : (
                  "Publier"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
