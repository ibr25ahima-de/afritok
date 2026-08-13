import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Wallet() {
  const [showRecharge, setShowRecharge] = useState(false);

  const { data: wallet, isLoading } =
    trpc.wallet.getBalance.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement du portefeuille...</p>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold">
            Mon portefeuille
          </h1>

          <p className="text-muted-foreground">
            Recharge ton solde pour acheter des Coins.
          </p>
        </div>

        <div className="rounded-2xl border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Solde disponible
          </p>

          <p className="text-4xl font-bold mt-2">
            {Number(balance).toLocaleString("fr-FR")} XOF
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRecharge(true)}
          className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
        >
          + Recharger mon portefeuille
        </button>

        {showRecharge && (
          <div className="rounded-2xl border p-5">
            <h2 className="text-lg font-semibold">
              Recharger mon portefeuille
            </h2>

            <p className="text-sm text-muted-foreground mt-2">
              Le choix de l'opérateur et le paiement
              Mobile Money seront ajoutés à l'étape suivante.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
