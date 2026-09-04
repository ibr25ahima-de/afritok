import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useSettingsText } from "@/hooks/useSettingsText";

interface SettingsHeaderProps { userId?: number; }

export default function SettingsHeader({ userId }: SettingsHeaderProps) {
  const [, navigate] = useLocation();
  const t = useSettingsText();
  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
      <button onClick={() => navigate("/profile/" + userId)} className="text-white hover:text-gray-300 transition" aria-label={t("account", "Compte")}><ArrowLeft size={24} /></button>
      <h1 className="text-lg font-bold">{t("title", "Paramètres et confidentialité")}</h1>
    </header>
  );
}
