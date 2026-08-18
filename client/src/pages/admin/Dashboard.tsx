import React from "react";
import { trpc } from "@/lib/trpc";
import { StatCards } from "../../components/admin/StatCards";
import { FinanceCards } from "../../components/admin/FinanceCards";

export default function Dashboard() {
  const { data: stats } =
    trpc.admin.getDashboardStats.useQuery();

  const { data: platformWallet } =
    trpc.platformFinance.getWallet.useQuery();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">
        Dashboard Overview
      </h1>

      {/* Statistiques existantes */}
      <StatCards stats={stats} />

      {/* Finance existante */}
      <FinanceCards stats={stats} />

      {/* 💰 NOUVEAU : ARGENT RÉEL AFRITOK */}
      <div className="rounded-2xl border border-green-500/20 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Solde réel AfriTok
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {platformWallet
                ? `${platformWallet.balance.toLocaleString("fr-FR")} ${platformWallet.currency}`
                : "Chargement..."}
            </p>
          </div>

          <div className="text-4xl">
            💰
          </div>
        </div>
      </div>
    </div>
  );
      }
