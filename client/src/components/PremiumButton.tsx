import { Crown } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

/** Point d'entrée Premium affiché uniquement sur le profil de l'utilisateur connecté. */
export default function PremiumButton() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [, profileParams] = useRoute("/profile/:userId");

  const viewedUserId = profileParams?.userId ? Number(profileParams.userId) : user?.id;
  if (!user || viewedUserId !== user.id) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/premium")}
      className="w-full max-w-[calc(100vw-2rem)] bg-amber-400/10 border border-amber-400/40 rounded-xl p-4 flex items-center justify-between hover:bg-amber-400/20 transition shadow-lg"
      aria-label="Découvrir AfriTok Premium"
    >
      <div className="flex items-center gap-3 text-left">
        <Crown size={26} className="text-amber-400" />
        <div>
          <p className="text-white font-bold">⭐ AfriTok Premium</p>
          <p className="text-gray-400 text-sm">Des fonctionnalités exclusives pour les abonnés</p>
        </div>
      </div>
      <span className="text-amber-400 font-bold text-xl">→</span>
    </button>
  );
}
