import React from "react";

interface FinanceCardsProps {
  stats: any;
}

export const FinanceCards: React.FC<FinanceCardsProps> = ({ stats }) => {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-12">
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          💵 Revenu total
        </h3>
        <p className="text-3xl font-bold text-green-400">
          {stats?.totalRevenue ?? 0}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          🏦 Part AfriTok
        </h3>
        <p className="text-3xl font-bold text-yellow-400">
          {stats?.afritokProfit ?? 0}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          👥 Gains créateurs
        </h3>
        <p className="text-3xl font-bold text-blue-400">
          {stats?.usersEarnings ?? 0}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          👀 Vues totales
        </h3>
        <p className="text-3xl font-bold text-white">
          {stats?.views ?? 0}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          📅 Revenus du jour
        </h3>
        <p className="text-3xl font-bold text-green-400">
          {stats?.today ?? 0}
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <h3 className="text-purple-300 font-semibold mb-2">
          ⏳ Retraits en attente
        </h3>
        <p className="text-3xl font-bold text-orange-400">
          {stats?.pendingWithdrawals ?? 0}
        </p>
      </div>
    </div>
  );
};
