import { trpc } from "@/lib/trpc";

export default function Gifts() {
  const {
    data: gifts,
    isLoading,
    error,
  } = trpc.gifts.getAvailable.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement des cadeaux...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-400 text-center">
          Impossible de charger les cadeaux.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold">
            🎁 Cadeaux virtuels
          </h1>

          <p className="text-muted-foreground mt-1">
            Utilise tes Coins pour faire plaisir aux créateurs.
          </p>
        </div>

        <div className="rounded-2xl border p-5">
          <p className="text-sm text-muted-foreground">
            Mon solde
          </p>

          <p className="text-3xl font-bold mt-1">
            🪙 Coins
          </p>
        </div>

        {!gifts || gifts.length === 0 ? (
          <div className="rounded-2xl border p-6 text-center">
            <p className="text-muted-foreground">
              Aucun cadeau disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {gifts.map((gift) => (
              <div
                key={gift.id}
                className="rounded-2xl border p-5 text-center"
              >
                <div className="text-5xl">
                  {gift.icon}
                </div>

                <h2 className="font-bold mt-3">
                  {gift.name}
                </h2>

                <p className="text-yellow-400 font-semibold mt-1">
                  🪙{" "}
                  {gift.coinPrice.toLocaleString(
                    "fr-FR"
                  )}
                </p>

                <button
                  type="button"
                  disabled
                  className="w-full mt-4 rounded-xl bg-yellow-500/20 px-4 py-2 text-yellow-400 font-semibold opacity-50 cursor-not-allowed"
                >
                  Envoyer
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
