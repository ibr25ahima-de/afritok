import React from "react";
import { DollarSign, CheckCircle } from "lucide-react";

interface WithdrawalTableProps {
  withdrawals: any[];
  onMarkPaid: (id: number) => void;
  isPending: boolean;
}

export const WithdrawalTable: React.FC<WithdrawalTableProps> = ({
  withdrawals,
  onMarkPaid,
  isPending,
}) => {
  return (
    <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 md:col-span-2">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-green-400" />
        Payment Management
      </h2>
      <div className="space-y-3">
        <p className="text-purple-300 mb-4">Process and track user withdrawals</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-purple-100">
            <thead className="bg-slate-800/50 text-purple-300 uppercase text-xs">
              <tr>
                <th className="p-4">User ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Method</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-800/30">
              {withdrawals?.map((withdrawal: any) => (
                <tr key={withdrawal.id} className="hover:bg-purple-800/20 transition-colors">
                  <td className="p-4">#{withdrawal.userId}</td>
                  <td className="p-4 font-bold text-green-400">{withdrawal.amount}€</td>
                  <td className="p-4">{withdrawal.paymentMethod}</td>
                  <td className="p-4 text-sm">{withdrawal.phone}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        withdrawal.status === "paid"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {withdrawal.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {withdrawal.status === 'pending' && (
                      <button
                        onClick={() => onMarkPaid(withdrawal.id)}
                        disabled={isPending}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Valider paiement
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!withdrawals || withdrawals.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-purple-400 italic">
                    No withdrawal requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
