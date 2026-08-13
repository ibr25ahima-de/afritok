import { Coins as CoinsIcon } from "lucide-react";
import { useLocation } from "wouter";

export function CoinsButton() {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate("/coins")}
      className="w-full mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between hover:bg-yellow-500/20 transition"
    >
      <div className="flex items-center gap-3">
        <CoinsIcon
          size={26}
          className="text-yellow-400"
        />

        <div className="text-left">
          <p className="text-white font-bold">
            Mes Coins
          </p>

          <p className="text-gray-400 text-sm">
            Acheter et utiliser mes Coins
          </p>
        </div>
      </div>

      <span className="text-yellow-400 font-bold text-xl">
        →
      </span>
    </button>
  );
}
