import React from "react";
import { trpc } from "@/lib/trpc";
import { StatCards } from "../../components/admin/StatCards";
import { FinanceCards } from "../../components/admin/FinanceCards";

export default function Dashboard() {
  const { data: stats } = trpc.admin.getDashboardStats.useQuery();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
      <StatCards stats={stats} />
      <FinanceCards stats={stats} />
    </div>
  );
}
