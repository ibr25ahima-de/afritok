import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface SettingsHeaderProps {
  userId?: number;
}

export default function SettingsHeader({
  userId,
}: SettingsHeaderProps) {
  const [, navigate] = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
      <button
        onClick={() => navigate("/profile/" + userId)}
        className="text-white hover:text-gray-300 transition"
      >
        <ArrowLeft size={24} />
      </button>

      <h1 className="text-lg font-bold">
        Paramètres et confidentialité
      </h1>
    </header>
  );
}
