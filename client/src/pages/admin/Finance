import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Finance() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Orange Money");
  const [phone, setPhone] = useState("");

  const utils = trpc.useUtils();

  const {
    data: balance,
    isLoading,
    error,
  } = trpc.admin.getPlatformBalance.useQuery();

  const {
    data: withdrawals,
    isLoading: withdrawalsLoading,
  } = trpc.admin.getPlatformWithdrawals.useQuery();

  const withdrawalMutation =
    trpc.admin.requestPlatformWithdrawal.useMutation({
      onSuccess: () => {
        setAmount("");
        setPhone("");

        utils.admin.getPlatformBalance.invalidate();
        utils.admin.getPlatformWithdrawals.invalidate();
      },
    });

  const handleWithdrawal = () => {
    const value = Number(amount);

    if (!value || value <= 0) {
      alert("Entre un montant valide.");
      return;
    }

    if (value > Number(balance?.available || 0)) {
      alert(
        `Solde insuffisant. Disponible : ${Number(
          balance?.available || 0
        ).toFixed(2)} $`
      );
      return;
    }

    if (!phone || phone.length < 8) {
      alert("Entre un numéro ou compte de paiement valide.");
      return;
    }

    withdrawalMutation.mutate({
      amount: value,
      paymentMethod,
      phone,
    });
  };

  if (isLoading) {
    return (
      <div className="text-white text-center py-20">
        Chargement des finances AfriTok...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-red-300">
        Erreur lors du chargement des finances :
        <br />
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          💰 Finance AfriTok
        </h1>

        <p className="text-purple-300 mt-2">
          Gestion de l'argent appartenant à la plateforme
        </p>
      </div>

      {/* SOLDE */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">
          <p className="text-purple-300 mb-2">
            Revenus AfriTok
          </p>

          <p className="text-3xl font-bold text-green-400">
            ${Number(balance?.totalEarned || 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">
          <p className="text-purple-300 mb-2">
            Déjà retiré
          </p>

          <p className="text-3xl font-bold text-orange-400">
            ${Number(balance?.totalWithdrawn || 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-green-700/50 rounded-xl p-6">
          <p className="text-purple-300 mb-2">
            💵 Solde disponible
          </p>

          <p className="text-3xl font-bold text-green-400">
            ${Number(balance?.available || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* RETRAIT */}
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">
          🏦 Retirer l'argent AfriTok
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-purple-300 mb-2">
              Montant à retirer
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex : 100"
              className="w-full bg-slate-900 border border-purple-700 rounded-lg px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="block text-purple-300 mb-2">
              Moyen de paiement
            </label>

            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value)
              }
              className="w-full bg-slate-900 border border-purple-700 rounded-lg px-4 py-3 text-white"
            >
              <option>Orange Money</option>
              <option>MTN Money</option>
              <option>Wave</option>
              <option>PayPal</option>
              <option>Virement bancaire</option>
            </select>
          </div>

          <div>
            <label className="block text-purple-300 mb-2">
              Numéro / compte de paiement
            </label>

            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Numéro ou compte"
              className="w-full bg-slate-900 border border-purple-700 rounded-lg px-4 py-3 text-white"
            />
          </div>

          <button
            onClick={handleWithdrawal}
            disabled={
              withdrawalMutation.isPending ||
              Number(balance?.available || 0) <= 0
            }
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-3 rounded-lg transition"
          >
            {withdrawalMutation.isPending
              ? "Traitement..."
              : "💸 Demander le retrait"}
          </button>

          {withdrawalMutation.isError && (
            <p className="text-red-400">
              {withdrawalMutation.error.message}
            </p>
          )}

          {withdrawalMutation.isSuccess && (
            <p className="text-green-400">
              ✅ Demande de retrait enregistrée.
            </p>
          )}
        </div>
      </div>

      {/* HISTORIQUE */}
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">
          📋 Historique des retraits AfriTok
        </h2>

        {withdrawalsLoading ? (
          <p className="text-purple-300">
            Chargement...
          </p>
        ) : !withdrawals || withdrawals.length === 0 ? (
          <p className="text-purple-300">
            Aucun retrait AfriTok pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((withdrawal: any) => (
              <div
                key={withdrawal.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900/70 rounded-lg p-4"
              >
                <div>
                  <p className="text-white font-semibold">
                    ${Number(withdrawal.amount).toFixed(2)}
                  </p>

                  <p className="text-sm text-purple-300">
                    {withdrawal.paymentMethod}
                  </p>

                  <p className="text-sm text-purple-400">
                    {withdrawal.phone}
                  </p>
                </div>

                <span
                  className={`mt-2 md:mt-0 px-3 py-1 rounded-full text-sm ${
                    withdrawal.status === "paid"
                      ? "bg-green-900/40 text-green-400"
                      : withdrawal.status === "pending"
                      ? "bg-orange-900/40 text-orange-400"
                      : "bg-red-900/40 text-red-400"
                  }`}
                >
                  {withdrawal.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
