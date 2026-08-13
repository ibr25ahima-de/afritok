import { useState } from "react";
import { ArrowLeft, Coins as CoinsIcon, History, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Coins() {
  const [, navigate] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const balanceQuery = trpc.coins.getBalance.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const packagesQuery = trpc.coins.getPackages.useQuery();

  const balance = balanceQuery.data?.balance ?? 0;
  const packages = packagesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-black text-white pb-20">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/profile")}
          className="text-white"
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-xl font-bold">
          Mes Coins
        </h1>
      </header>

      {/* SOLDE */}
      <section className="px-4 pt-6">
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">

          <div className="flex items-center gap-3 mb-3">
            <CoinsIcon
              size={30}
              className="text-yellow-400"
            />

            <span className="text-gray-300">
              Solde disponible
            </span>
          </div>

          <p className="text-4xl font-bold text-yellow-400">
            {Number(balance).toLocaleString("fr-FR")}
          </p>

          <p className="text-gray-400 text-sm mt-2">
            Coins
          </p>
        </div>
      </section>

      {/* ACHETER */}
      <section className="px-4 mt-8">

        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart
            size={20}
            className="text-yellow-400"
          />

          <h2 className="text-lg font-bold">
            Acheter des Coins
          </h2>
        </div>

        {packagesQuery.isLoading ? (
          <p className="text-gray-400">
            Chargement des offres...
          </p>
        ) : packages.length === 0 ? (
          <p className="text-gray-400">
            Aucun pack disponible.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">

            {packages.map((coinPackage) => (
              <button
                key={coinPackage.id}
                onClick={() =>
                  setSelectedPackage(coinPackage.id)
                }
                className={`p-4 rounded-xl border text-left transition ${
                  selectedPackage === coinPackage.id
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-gray-800 bg-gray-900 hover:border-gray-600"
                }`}
              >

                <div className="flex items-center gap-2">
                  <CoinsIcon
                    size={18}
                    className="text-yellow-400"
                  />

                  <span className="font-bold">
                    {Number(coinPackage.coins).toLocaleString("fr-FR")}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mt-2">
                  {Number(coinPackage.price).toLocaleString("fr-FR")}{" "}
                  {coinPackage.currency}
                </p>

              </button>
            ))}

          </div>
        )}

      </section>

      {/* BOUTON CONTINUER */}
      {selectedPackage && (
        <section className="px-4 mt-6">

          <button
            disabled
            className="w-full bg-yellow-500/50 text-black py-4 rounded-xl font-bold opacity-70"
          >
            Continuer vers le paiement
          </button>

          <p className="text-gray-500 text-xs text-center mt-3">
            Le paiement réel sera connecté à l'étape suivante.
          </p>

        </section>
      )}

      {/* UTILISATION DES COINS */}
      <section className="px-4 mt-10">

        <h2 className="text-lg font-bold mb-4">
          Utiliser mes Coins
        </h2>

        <div className="space-y-3">

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>

              <div>
                <p className="font-semibold">
                  Cadeaux pendant les Lives
                </p>

                <p className="text-gray-400 text-sm">
                  Utilise tes Coins pour envoyer des cadeaux
                  au propriétaire du Live.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❤️</span>

              <div>
                <p className="font-semibold">
                  Faire plaisir au propriétaire d'une vidéo
                </p>

                <p className="text-gray-400 text-sm">
                  Utilise tes Coins pour envoyer un cadeau
                  au créateur d'une vidéo.
                </p>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* HISTORIQUE */}
      <section className="px-4 mt-10">

        <button
          onClick={() => navigate("/coins/history")}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"
        >
          <History
            size={20}
            className="text-gray-300"
          />

          <span className="font-semibold">
            Historique de mes Coins
          </span>
        </button>

      </section>

    </div>
  );
}
