import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Publish() {
  const [, navigate] = useLocation();

  const [description, setDescription] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);

  const handlePublish = () => {
    // Pour l'instant simulation
    // Upload réel Supabase viendra après
    navigate("/feed");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <button onClick={() => navigate("/upload")}>
          <ChevronLeft />
        </button>
        <h1 className="font-semibold text-lg">Publier</h1>
        <div className="w-6" />
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Preview cover */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-28 bg-gray-800 rounded-lg flex items-center justify-center">
            <Image />
          </div>

          <textarea
            placeholder="Décris ta vidéo..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 bg-transparent outline-none resize-none text-white placeholder-gray-400"
            rows={4}
          />
        </div>

        {/* Options TikTok */}
        <div className="space-y-4">
          <Toggle
            label="Autoriser commentaires"
            value={allowComments}
            onChange={setAllowComments}
          />

          <Toggle
            label="Autoriser Duo"
            value={allowDuet}
            onChange={setAllowDuet}
          />

          <Toggle
            label="Autoriser Stitch"
            value={allowStitch}
            onChange={setAllowStitch}
          />
        </div>
      </div>

      {/* PUBLISH BUTTON */}
      <div className="p-4 border-t border-gray-800">
        <Button
          onClick={handlePublish}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Publier
        </Button>
      </div>
    </div>
  );
}

/** Small toggle component */
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition ${
          value ? "bg-red-600" : "bg-gray-700"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
