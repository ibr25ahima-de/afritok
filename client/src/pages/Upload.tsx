import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function Upload() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadFileMutation = trpc.video.uploadFile.useMutation();

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
    
    // Vérifier que c'est une vidéo
    if (!selectedFile.type.startsWith("video/")) {
      toast.error("Veuillez sélectionner une vidéo");
      return;
    }
    
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || !user) return;

    setIsLoading(true);

    try {
      // Utiliser la mutation tRPC pour uploader le fichier
      await uploadFileMutation.mutateAsync({
        file: file,
        title: title || file.name,
        description: description || undefined,
      });

      // Afficher le message de succès
      setUploadSuccess(true);
      toast.success("✅ Vidéo publiée avec succès !");

      // Reset le formulaire
      setFile(null);
      setTitle("");
      setDescription("");
      setPreviewUrl(null);

      // Rediriger vers le Feed après 2 secondes
      setTimeout(() => {
        navigate("/feed");
      }, 2000);

    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("❌ Erreur lors de l'upload. Veuillez réessayer.");
      setUploadSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Afficher le message de succès
  if (uploadSuccess) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <CheckCircle size={64} className="text-green-500 animate-bounce" />
        <h2 className="text-2xl font-bold">Vidéo publiée avec succès ! 🎉</h2>
        <p className="text-gray-400">Redirection vers le Feed...</p>
      </div>
    );
  }

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
                  setPreviewUrl(null);
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
