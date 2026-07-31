import React from "react";
import { trpc } from "@/lib/trpc";
import { FinanceCards } from "../../components/admin/FinanceCards";

export default function Finance() {
  const { data: stats } = trpc.admin.getDashboardStats.useQuery();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Financial Statistics</h1>
      <FinanceCards stats={stats} />
    </div>
  );
}
