import { useState } from "react";
import { GIFTS } from "../../../server/coins/gifts";

type GiftSelectorProps = {
  receiverId: number;
  videoId?: number;
  onClose: () => void;
};

export function GiftSelector({ onClose }: GiftSelectorProps) {
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const selectedGift = GIFTS.find((gift) => gift.id === selectedGiftId);

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">🎁 Cadeaux virtuels BiYaloxi</h2>
          <p className="mt-1 text-sm text-gray-400">Choisis un cadeau pour voir son prix en Coins.</p>
        </div>
        <button type="button" onClick={onClose} className="text-lg text-gray-400 hover:text-white" aria-label="Fermer">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GIFTS.map((gift) => {
          const selected = selectedGiftId === gift.id;
          return (
            <button
              key={gift.id}
              type="button"
              onClick={() => { setSelectedGiftId(gift.id); setQuantity(1); }}
              className={`rounded-2xl border p-4 text-center transition ${selected ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
            >
              <div className="text-4xl">{gift.icon}</div>
              <p className="mt-2 font-semibold text-white">{gift.name}</p>
              <p className="mt-1 text-sm font-bold text-yellow-400">🪙 {gift.coins.toLocaleString("fr-FR")}</p>
            </button>
          );
        })}
      </div>

      {selectedGift && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{selectedGift.icon}</div>
            <div className="flex-1">
              <p className="font-bold text-white">{selectedGift.name}</p>
              <p className="text-sm text-gray-400">Prix : <span className="font-semibold text-yellow-400">{selectedGift.coins.toLocaleString("fr-FR")} Coins</span></p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-400">Quantité</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9 rounded-lg bg-white/10 text-white" aria-label="Diminuer">−</button>
              <span className="min-w-[24px] text-center font-bold text-white">{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(100, quantity + 1))} className="h-9 w-9 rounded-lg bg-white/10 text-white" aria-label="Augmenter">+</button>
            </div>
          </div>
          <div className="mt-4 text-center">
            <span className="text-gray-400">Total : </span>
            <span className="font-bold text-yellow-400">{(selectedGift.coins * quantity).toLocaleString("fr-FR")} Coins</span>
          </div>
          <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-primary py-3 font-bold text-primary-foreground opacity-50">
            Envoi indisponible pour le moment
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">Les achats et l’envoi des cadeaux ne sont pas encore configurés.</p>
        </div>
      )}
    </div>
  );
}
