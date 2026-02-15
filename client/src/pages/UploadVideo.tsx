import { useState, useRef } from "react";
import AudioSelector from "@/components/AudioSelector";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/_core/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function UploadVideo() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.video.upload.useMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [showAudioSelector, setShowAudioSelector] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<{ url: string; name: string } | null>(null);

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Veuillez sélectionner un fichier vidéo valide");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError("La vidéo ne doit pas dépasser 100 MB");
      return;
    }

    setSelectedFile(file);
    setError("");
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setError("Veuillez remplir le titre et sélectionner une vidéo");
      return;
    }

    setUploadProgress(10);
    setError("");

    try {
      await uploadMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        file: selectedFile,
      });

      setUploadProgress(100);
      setSuccess(true);

      setTimeout(() => {
        setTitle("");
        setDescription("");
        setSelectedFile(null);
        setPreview("");
        setUploadProgress(0);
        navigate(`/profile/${user?.id}`);
      }, 2000);

    } catch (err) {
      console.error(err);
      setError("Échec du chargement de la vidéo");
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/feed")}
            className="text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <span className="text-xl font-bold text-white">{APP_TITLE}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">
            Télécharger une vidéo
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-600/50 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-900/20 transition"
              >
                {preview ? (
                  <div className="space-y-4">
                    <video
                      src={preview}
                      className="w-full h-48 object-cover rounded-lg"
                      controls
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setPreview("");
                      }}
                      className="text-red-400 hover:text-red-300 flex items-center gap-2 mx-auto"
                    >
                      <X className="w-4 h-4" />
                      Changer la vidéo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-purple-400 mx-auto" />
                    <p className="text-white font-semibold">
                      Cliquez pour sélectionner une vidéo
                    </p>
                    <p className="text-purple-400 text-xs">
                      MP4, WebM, MOV • Max 100 MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-purple-300 font-semibold mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-semibold mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white"
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-900/30 border border-green-800/50 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-green-300 text-sm">
                    Vidéo uploadée avec succès !
                  </p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !title.trim() || uploadMutation.isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3"
              >
                {uploadMutation.isLoading ? "Chargement..." : "Télécharger la vidéo"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showAudioSelector && (
        <AudioSelector
          onSelectAudio={(url, name) => {
            setSelectedAudio({ url, name });
            setShowAudioSelector(false);
          }}
          onClose={() => setShowAudioSelector(false)}
        />
      )}
    </div>
  );
    }
