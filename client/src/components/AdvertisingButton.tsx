import { Megaphone } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Bouton publicitaire réutilisable.
 * Ne contient aucune logique métier : il ouvre simplement
 * la page dédiée à la création d'une publicité.
 */
export default function AdvertisingButton() {
  const [, navigate] = useLocation();

  return (
    <button
      type="button"
      onClick={() => navigate("/advertising")}
      aria-label="Faire de la publicité sur AfriTok"
      className="flex items-center gap-2 rounded-full border border-amber-400/60 bg-black/70 px-4 py-2 text-sm font-black text-amber-300 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-amber-400 hover:text-black active:scale-95"
    >
      <Megaphone size={18} />
      <span>Faire de la publicité</span>
    </button>
  );
}
