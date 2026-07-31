import React from "react";
import { trpc } from "@/lib/trpc";
import { WithdrawalTable } from "../../components/admin/WithdrawalTable";

export default function Withdrawals() {
  const { data: withdrawals, refetch } = trpc.admin.getAllWithdrawals.useQuery();
  const markPaid = trpc.admin.markWithdrawalPaid.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Finance & Withdrawals</h1>
      <WithdrawalTable 
        withdrawals={withdrawals || []}
        onMarkPaid={(withdrawalId) => markPaid.mutate({ withdrawalId })}
        isPending={markPaid.isPending}
      />
    </div>
  );
}
