import React from "react";

interface FinanceCardsProps {
  stats: any;
}

const formatCurrency = (val: any): string => {
  const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumber = (val: any): string => {
  const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const FinanceCards: React.FC<FinanceCardsProps> = ({ stats }) => {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-12">
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          💵 Revenu total
        </h3>
        <p className="text-3xl font-bold text-green-400">
          ${formatCurrency(stats?.totalRevenue ?? 0)}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          🏦 Part AfriTok
        </h3>
        <p className="text-3xl font-bold text-yellow-400">
          ${formatCurrency(stats?.afritokProfit ?? 0)}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          👥 Gains créateurs
        </h3>
        <p className="text-3xl font-bold text-blue-400">
          ${formatCurrency(stats?.usersEarnings ?? 0)}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          👀 Vues totales
        </h3>
        <p className="text-3xl font-bold text-white">
          {formatNumber(stats?.views ?? 0)}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          📅 Revenus du jour
        </h3>
        <p className="text-3xl font-bold text-green-400">
          ${formatCurrency(stats?.today ?? 0)}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          ⏳ Retraits en attente
        </h3>
        <p className="text-3xl font-bold text-orange-400">
          ${formatCurrency(stats?.pendingWithdrawals ?? 0)}
        </p>
      </div>
    </div>
  );
};
