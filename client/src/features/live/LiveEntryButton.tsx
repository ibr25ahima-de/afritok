import { Radio } from "lucide-react";
import { useLocation } from "wouter";

type LiveEntryButtonProps = {
  className?: string;
};

export function LiveEntryButton({ className = "" }: LiveEntryButtonProps) {
  const [, navigate] = useLocation();

  return (
    <button
      type="button"
      onClick={() => navigate("/live")}
      aria-label="Passer en Live"
      className={`flex items-center justify-center gap-2 rounded-full bg-red-500 px-5 py-3 font-bold text-white shadow-lg touch-manipulation active:scale-95 ${className}`}
    >
      <Radio size={20} aria-hidden="true" />
      <span>Passer en Live</span>
    </button>
  );
}
