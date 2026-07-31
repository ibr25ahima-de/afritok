import React from "react";
import { Users, Video, TrendingUp } from "lucide-react";

interface StatCardsProps {
  stats: any;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-12">
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-purple-300 font-semibold">Total Users</h3>
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <p className="text-3xl font-bold text-white">
          {stats?.users ?? 0}
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
          {stats?.videos ?? 0}
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
          {stats?.totalWithdrawals ?? 0}
        </p>
        <p className="text-sm text-purple-300 mt-2">
          Retraits payés
        </p>
      </div>
    </div>
  );
};
