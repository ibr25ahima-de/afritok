import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";

export default function Publish() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { setFile, setPreview } = useUpload();

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFileState] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [step, setStep] = useState("upload");

  /** GET FILE FROM UPLOAD */
  useEffect(() => {
    const data = sessionStorage.getItem("afritok_video_data");
    const name = sessionStorage.getItem("afritok_video_name");
    const type = sessionStorage.getItem("afritok_video_type");

    if (!data || !name || !type) return;

    setVideoUrl(data);

    fetch(data)
      .then((res) => res.blob())
      .then((blob) => {
        const f = new File([blob], name, { type });
        setFileState(f);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFile(file);
      setPreview(url);
      setVideoUrl(url);
      setStep("preview");
    }
  };

  const handleNext = () => {
    navigate("/publish");
  };

  /** PUBLISH */
  const handlePublish = async () => {
    if (!file || !user) {
      alert("Vidéo manquante");
      return;
    }

    setLoading(true);

    try {
      const fileName = `${user.id}-${Date.now()}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("videos").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: insertError } = await supabase.from("videos").insert({
        userId: user.id,
        videoUrl: publicUrl,
        description: caption,
      });

      if (insertError) throw insertError;

      sessionStorage.clear();

      navigate("/feed");
    } catch (err) {
      console.error(err);
      alert("Erreur upload");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col p-4">
      <h1 className="text-xl font-bold mb-4">Publier vidéo</h1>

      {videoUrl && (
        <video
          src={videoUrl}
          className="w-full h-60 object-cover rounded-lg mb-4"
          autoPlay
          loop
          muted
        />
      )}

      <textarea
        placeholder="Description..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="bg-gray-900 p-3 rounded mb-4"
      />

      <button
        onClick={handlePublish}
        disabled={loading}
        className="w-full bg-red-600 py-3 rounded-lg font-semibold flex justify-center"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Publier"}
      </button>
    </div>
  );
}
