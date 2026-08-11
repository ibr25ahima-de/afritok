import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Wallet, ArrowDownToLine, History, Loader2 } from "lucide-react";

const formatCurrency = (value: number) => {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function Finance() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Orange Money");
  const [phone, setPhone] = useState("");

  const utils = trpc.useUtils();

  // 💰 Solde réel AfriTok
  const {
    data: balance,
    isLoading: balanceLoading,
  } = trpc.admin.getPlatformBalance.useQuery();

  // 📋 Historique
  const {
    data: withdrawals,
    isLoading: withdrawalsLoading,
  } = trpc.admin.getPlatformWithdrawals.useQuery();

  // 💸 Demande de retrait
  const withdrawalMutation =
    trpc.admin.requestPlatformWithdrawal.useMutation({
      onSuccess: () => {
        setAmount("");
        setPhone("");

        utils.admin.getPlatformBalance.invalidate();
        utils.admin.getPlatformWithdrawals.invalidate();

        alert("Demande de retrait envoyée avec succès.");
      },

      onError: (error) => {
        alert(error.message);
      },
    });

  const handleWithdrawal = () => {
    const withdrawalAmount = Number(amount);

    if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
      alert("Veuillez entrer un montant valide.");
      return;
    }

    if (!balance || withdrawalAmount > balance.available) {
      alert(
        `Solde insuffisant. Disponible : ${formatCurrency(
          balance?.available ?? 0
        )} $`
      );
      return;
    }

    if (!phone.trim()) {
      alert("Veuillez entrer le numéro ou compte de paiement.");
      return;
    }

    withdrawalMutation.mutate({
      amount: withdrawalAmount,
      paymentMethod,
      phone: phone.trim(),
    });
  };

  return (
    <div className="space-y-8">

      {/* TITRE */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          💰 Finance AfriTok
        </h1>

        <p className="text-purple-300 mt-2">
          Gestion de l'argent appartenant à la plateforme
        </p>
      </div>

      {/* CARTES FINANCIÈRES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* TOTAL GAGNÉ */}
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Wallet className="w-6 h-6 text-green-400" />

            <h2 className="text-purple-300 font-semibold">
              Revenus AfriTok
            </h2>
          </div>

          <p className="text-3xl font-bold text-green-400">
            {balanceLoading
              ? "..."
              : `$${formatCurrency(balance?.totalEarned ?? 0)}`}
          </p>
        </div>

        {/* DÉJÀ RETIRÉ */}
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <ArrowDownToLine className="w-6 h-6 text-orange-400" />

            <h2 className="text-purple-300 font-semibold">
              Déjà retiré
            </h2>
          </div>

          <p className="text-3xl font-bold text-orange-400">
            {balanceLoading
              ? "..."
              : `$${formatCurrency(balance?.totalWithdrawn ?? 0)}`}
          </p>
        </div>

        {/* DISPONIBLE */}
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Wallet className="w-6 h-6 text-yellow-400" />

            <h2 className="text-purple-300 font-semibold">
              💵 Solde disponible
            </h2>
          </div>

          <p className="text-3xl font-bold text-yellow-400">
            {balanceLoading
              ? "..."
              : `$${formatCurrency(balance?.available ?? 0)}`}
          </p>
        </div>
      </div>

      {/* RETRAIT */}
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">

        <h2 className="text-xl font-bold text-white mb-6">
          🏦 Retirer l'argent AfriTok
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* MONTANT */}
          <div>
            <label className="block text-sm text-purple-300 mb-2">
              Montant à retirer
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex : 100"
              className="w-full rounded-lg bg-slate-900 border border-purple-700/50 px-4 py-3 text-white outline-none focus:border-purple-400"
            />
          </div>

          {/* MOYEN DE PAIEMENT */}
          <div>
            <label className="block text-sm text-purple-300 mb-2">
              Moyen de paiement
            </label>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-purple-700/50 px-4 py-3 text-white outline-none"
            >
              <option>Orange Money</option>
              <option>MTN Money</option>
              <option>Wave</option>
              <option>PayPal</option>
              <option>Virement bancaire</option>
            </select>
          </div>

          {/* NUMÉRO */}
          <div>
            <label className="block text-sm text-purple-300 mb-2">
              Numéro / compte de paiement
            </label>

            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Numéro ou compte"
              className="w-full rounded-lg bg-slate-900 border border-purple-700/50 px-4 py-3 text-white outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* BOUTON */}
        <button
          onClick={handleWithdrawal}
          disabled={
            withdrawalMutation.isPending ||
            balanceLoading ||
            !balance ||
            balance.available <= 0
          }
          className="mt-6 w-full md:w-auto px-8 py-3 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white flex items-center justify-center gap-2"
        >
          {withdrawalMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <ArrowDownToLine className="w-5 h-5" />
              💸 Demander le retrait
            </>
          )}
        </button>
      </div>

      {/* HISTORIQUE */}
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-6">

        <div className="flex items-center gap-3 mb-6">
          <History className="w-6 h-6 text-purple-400" />

          <h2 className="text-xl font-bold text-white">
            📋 Historique des retraits AfriTok
          </h2>
        </div>

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

            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-900/60 border border-purple-800/30 rounded-lg p-4"
              >

                <div>
                  <p className="font-bold text-white">
                    ${formatCurrency(Number(withdrawal.amount))}
                  </p>

                  <p className="text-sm text-purple-300">
                    {withdrawal.paymentMethod}
                  </p>

                  <p className="text-sm text-slate-400">
                    {withdrawal.phone}
                  </p>
                </div>

                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      withdrawal.status === "paid"
                        ? "bg-green-500/20 text-green-400"
                        : withdrawal.status === "pending"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {withdrawal.status === "paid"
                      ? "Payé"
                      : withdrawal.status === "pending"
                      ? "En attente"
                      : withdrawal.status}
                  </span>
                </div>

              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
}
