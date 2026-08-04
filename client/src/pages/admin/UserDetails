import React from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function UserDetails() {
  const [, params] = useRoute("/admin/users/:id");

  const { data, isLoading } =
    trpc.admin.getUserDetails.useQuery({
      userId: Number(params?.id),
    });

  if (isLoading) {
    return <div className="text-white p-6">Chargement...</div>;
  }

  if (!data) {
    return <div className="text-red-500 p-6">Utilisateur introuvable.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-white">
        Détails de l'utilisateur
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Nom</h3>
          <p className="text-white text-xl font-bold">
            {data.name || "Sans nom"}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Téléphone</h3>
          <p className="text-white text-xl font-bold">
            {data.phone}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Solde total</h3>
          <p className="text-green-400 text-2xl font-bold">
            {data.totalEarnings}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Retraits</h3>
          <p className="text-red-400 text-2xl font-bold">
            {data.totalWithdrawals}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Vidéos</h3>
          <p className="text-blue-400 text-2xl font-bold">
            {data.stats.videos}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Historique des gains</h3>
          <p className="text-yellow-400 text-2xl font-bold">
            {data.stats.earnings}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Historique des retraits</h3>
          <p className="text-cyan-400 text-2xl font-bold">
            {data.stats.withdrawals}
          </p>
        </div>

      </div>
    </div>
  );
}
