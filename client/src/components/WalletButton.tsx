import { Wallet as WalletIcon } from "lucide-react";
import { useLocation } from "wouter";

export function WalletButton() {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate("/wallet")}
      className="w-full mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between hover:bg-green-500/20 transition"
    >
      <div className="flex items-center gap-3">
        <WalletIcon
          size={26}
          className="text-green-400"
        />

        <div className="text-left">
          <p className="text-white font-bold">
            Mon Portefeuille
          </p>

          <p className="text-gray-400 text-sm">
            Recharger mon solde et payer
          </p>
        </div>
      </div>

      <span className="text-green-400 font-bold text-xl">
        →
      </span>
    </button>
  );
}
