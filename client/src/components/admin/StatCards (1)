import React from "react";
import { Users, Video, TrendingUp } from "lucide-react";

interface StatCardsProps {
  stats: any;
}

const formatNumber = (val: any): string => {
  const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatCurrency = (val: any): string => {
  const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
  return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-12">
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-purple-300 font-semibold">Total Users</h3>
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <p className="text-3xl font-bold text-white">
          {formatNumber(stats?.users ?? 0)}
        </p>
        <p className="text-sm text-purple-300 mt-2">
          Utilisateurs inscrits
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-purple-300 font-semibold">Total Videos</h3>
          <Video className="w-5 h-5 text-green-400" />
        </div>
        <p className="text-3xl font-bold text-white">
          {formatNumber(stats?.videos ?? 0)}
        </p>
        <p className="text-sm text-purple-300 mt-2">
          Vidéos publiées
        </p>
      </div>

      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-purple-300 font-semibold">Total Payouts</h3>
          <TrendingUp className="w-5 h-5 text-yellow-400" />
        </div>
        <p className="text-3xl font-bold text-white">
          ${formatCurrency(stats?.totalWithdrawals ?? 0)}
        </p>
        <p className="text-sm text-purple-300 mt-2">
          Retraits payés
        </p>
      </div>
    </div>
  );
};
