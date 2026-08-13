import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { WalletTopUp } from "@/components/WalletTopUp";

export default function Wallet() {
  const [showRecharge, setShowRecharge] = useState(false);

  const { data: wallet, isLoading } =
    trpc.wallet.getBalance.useQuery();

  const { data: transactions } =
    trpc.wallet.getTransactions.useQuery();

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
          onClick={() => setShowRecharge(!showRecharge)}
          className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
        >
          + Recharger mon portefeuille
        </button>

        {showRecharge && (
          <div className="rounded-2xl border p-5">
            <WalletTopUp />
          </div>
        )}

        <div className="rounded-2xl border p-5">
          <h2 className="text-lg font-bold">
            Historique de mes opérations
          </h2>

          {!transactions || transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">
              Aucune opération pour le moment.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {transaction.type === "deposit"
                        ? "Recharge"
                        : transaction.type}
                    </span>

                    <span className="font-bold">
                      {Number(
                        transaction.amount
                      ).toLocaleString("fr-FR")}{" "}
                      XOF
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-muted-foreground">
                    {transaction.paymentMethod && (
                      <p>
                        Opérateur :{" "}
                        {transaction.paymentMethod}
                      </p>
                    )}

                    <p>
                      Statut :{" "}
                      {transaction.status === "pending"
                        ? "En attente"
                        : transaction.status === "success"
                          ? "Réussi"
                          : "Échoué"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
            }
