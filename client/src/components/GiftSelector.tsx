import { useState } from "react";
import { trpc } from "@/lib/trpc";

type GiftSelectorProps = {
  receiverId: number;
  videoId?: number;
  onClose: () => void;
};

export function GiftSelector({
  receiverId,
  videoId,
  onClose,
}: GiftSelectorProps) {
  const [selectedGiftId, setSelectedGiftId] =
    useState<number | null>(null);

  const [quantity, setQuantity] =
    useState(1);

  const [message, setMessage] =
    useState<string | null>(null);

  const {
    data: gifts,
    isLoading,
    error,
  } = trpc.coins.getActiveGifts.useQuery();

  const sendGiftMutation =
    trpc.coins.sendGift.useMutation();

  const selectedGift =
    gifts?.find(
      (gift) =>
        gift.id === selectedGiftId
    );

  const handleSendGift = async () => {
    if (!selectedGift) return;

    if (!videoId) {
      setMessage(
        "Ce cadeau doit être envoyé depuis une vidéo."
      );
      return;
    }

    setMessage(null);

    try {
      const result =
        await sendGiftMutation.mutateAsync({
          recipientId: receiverId,

          giftId: selectedGift.id,

          quantity,

          context: "video",

          contextId:
            String(videoId),

          idempotencyKey:
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
        });

      if (result.duplicate) {
        setMessage(
          "Ce cadeau a déjà été envoyé."
        );
        return;
      }

      setMessage(
        `🎉 ${selectedGift.icon} ${selectedGift.name} envoyé ! Nouveau solde : ${result.balance.toLocaleString("fr-FR")} Coins`
      );

      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer le cadeau."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">
            🎁 Cadeaux
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="text-center text-gray-400 py-8">
          Chargement des cadeaux...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            🎁 Cadeaux
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="text-red-400 text-sm mt-5">
          Impossible de charger les cadeaux.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            🎁 Envoyer un cadeau
          </h2>

          <p className="text-sm text-gray-400 mt-1">
            Soutiens ce créateur avec tes Coins.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg"
        >
          ✕
        </button>
      </div>

      {gifts && gifts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {gifts.map((gift) => {
            const isSelected =
              selectedGiftId === gift.id;

            return (
              <button
                key={gift.id}
                type="button"
                onClick={() =>
                  setSelectedGiftId(gift.id)
                }
                className={`rounded-2xl border p-4 text-center transition ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="text-4xl">
                  {gift.icon}
                </div>

                <p className="text-white font-semibold mt-2">
                  {gift.name}
                </p>

                <p className="text-yellow-400 text-sm font-bold mt-1">
                  🪙{" "}
                  {gift.coinPrice.toLocaleString(
                    "fr-FR"
                  )}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-400 py-8">
          Aucun cadeau disponible.
        </p>
      )}

      {selectedGift && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">
              {selectedGift.icon}
            </div>

            <div className="flex-1">
              <p className="text-white font-bold">
                {selectedGift.name}
              </p>

              <p className="text-gray-400 text-sm">
                Prix :{" "}
                <span className="text-yellow-400 font-semibold">
                  {selectedGift.coinPrice.toLocaleString(
                    "fr-FR"
                  )}{" "}
                  Coins
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-gray-400">
              Quantité
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setQuantity(
                    Math.max(1, quantity - 1)
                  )
                }
                className="w-9 h-9 rounded-lg bg-white/10 text-white"
              >
                −
              </button>

              <span className="text-white font-bold min-w-[24px] text-center">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  setQuantity(
                    Math.min(100, quantity + 1)
                  )
                }
                className="w-9 h-9 rounded-lg bg-white/10 text-white"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-gray-400">
              Total:{" "}
            </span>

            <span className="text-yellow-400 font-bold">
              {(
                selectedGift.coinPrice *
                quantity
              ).toLocaleString("fr-FR")}{" "}
              Coins
            </span>
          </div>

          <button
            type="button"
            disabled={
              sendGiftMutation.isPending
            }
            onClick={handleSendGift}
            className="w-full mt-4 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {sendGiftMutation.isPending
              ? "Envoi en cours..."
              : `Envoyer ${selectedGift.icon} ${selectedGift.name}`}
          </button>

          {message && (
            <p
              className={`text-sm text-center mt-3 ${
                message.startsWith("🎉")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
