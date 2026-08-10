import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PlatformFinance() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Orange Money");
  const [phone, setPhone] = useState("");

  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = trpc.admin.getPlatformBalance.useQuery();

  const {
    data: withdrawals,
    isLoading: withdrawalsLoading,
  } = trpc.admin.getPlatformWithdrawals.useQuery();

  const withdrawalMutation =
    trpc.admin.requestPlatformWithdrawal.useMutation({
      onSuccess: async () => {
        toast.success("Demande de retrait envoyée avec succès.");

        setAmount("");

        await refetchBalance();
      },

      onError: (error) => {
        toast.error(error.message || "Erreur lors du retrait.");
      },
    });

  const handleWithdrawal = () => {
    const value = Number(amount);

    if (!value || value <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    if (!phone.trim()) {
      toast.error("Veuillez entrer le numéro de paiement.");
      return;
    }

    if (
      balance &&
      value > Number(balance.available)
    ) {
      toast.error(
        `Solde insuffisant. Disponible : ${Number(
          balance.available
        ).toFixed(2)} $`
      );
      return;
    }

    const confirmed = confirm(
      `Voulez-vous retirer ${value.toFixed(
        2
      )} $ vers ${phone} avec ${paymentMethod} ?`
    );

    if (!confirmed) return;

    withdrawalMutation.mutate({
      amount: value,
      paymentMethod,
      phone,
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold">
            💰 Finance AfriTok
          </h1>

          <p className="text-gray-400 mt-1">
            Gestion de l'argent appartenant à la plateforme
          </p>
        </div>

        {/* SOLDE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-purple-900/40 border border-purple-700 rounded-xl p-5">
            <p className="text-gray-400">
              Revenus AfriTok
            </p>

            <p className="text-3xl font-bold text-purple-300 mt-2">
              {balanceLoading
                ? "..."
                : `${Number(
                    balance?.totalEarned ?? 0
                  ).toFixed(2)} $`}
            </p>
          </div>

          <div className="bg-red-900/30 border border-red-700 rounded-xl p-5">
            <p className="text-gray-400">
              Déjà retiré
            </p>

            <p className="text-3xl font-bold text-red-400 mt-2">
              {balanceLoading
                ? "..."
                : `${Number(
                    balance?.totalWithdrawn ?? 0
                  ).toFixed(2)} $`}
            </p>
          </div>

          <div className="bg-green-900/30 border border-green-700 rounded-xl p-5">
            <p className="text-gray-400">
              💵 Solde disponible
            </p>

            <p className="text-3xl font-bold text-green-400 mt-2">
              {balanceLoading
                ? "..."
                : `${Number(
                    balance?.available ?? 0
                  ).toFixed(2)} $`}
            </p>
          </div>

        </div>

        {/* RETRAIT */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">

          <h2 className="text-xl font-bold mb-5">
            🏦 Retirer l'argent AfriTok
          </h2>

          <div className="space-y-4">

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Montant à retirer
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="Ex : 100"
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Moyen de paiement
              </label>

              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
              >
                <option>Orange Money</option>
                <option>MTN Money</option>
                <option>Wave</option>
                <option>PayPal</option>
                <option>Virement bancaire</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Numéro / compte de paiement
              </label>

              <input
                type="text"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="Ex : +225 05..."
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleWithdrawal}
              disabled={
                withdrawalMutation.isPending ||
                !balance?.available ||
                Number(balance.available) <= 0
              }
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition"
            >
              {withdrawalMutation.isPending
                ? "Traitement..."
                : "💸 Demander le retrait"}
            </button>

          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">

          <h2 className="text-xl font-bold mb-5">
            📋 Historique des retraits AfriTok
          </h2>

          {withdrawalsLoading ? (
            <p className="text-gray-400">
              Chargement...
            </p>
          ) : withdrawals?.length ? (
            <div className="space-y-3">

              {withdrawals.map((withdrawal: any) => (
                <div
                  key={withdrawal.id}
                  className="bg-black border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                    <div>
                      <p className="text-lg font-bold">
                        {Number(
                          withdrawal.amount
                        ).toFixed(2)} $
                      </p>

                      <p className="text-gray-400 text-sm">
                        {withdrawal.paymentMethod}
                      </p>

                      <p className="text-gray-500 text-sm">
                        {withdrawal.phone}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        withdrawal.status === "paid"
                          ? "bg-green-900 text-green-400"
                          : withdrawal.status === "pending"
                          ? "bg-yellow-900 text-yellow-400"
                          : "bg-red-900 text-red-400"
                      }`}
                    >
                      {withdrawal.status === "paid"
                        ? "✅ Payé"
                        : withdrawal.status === "pending"
                        ? "⏳ En attente"
                        : "❌ Refusé"}
                    </span>

                  </div>
                </div>
              ))}

            </div>
          ) : (
            <p className="text-gray-500">
              Aucun retrait AfriTok pour le moment.
            </p>
          )}

        </div>

      </div>
    </div>
  );
}
