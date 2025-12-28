import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, Wallet, Send } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useState } from "react";

export default function Monetization() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mtn_money");

  const statsQuery = trpc.monetization.stats.useQuery();
  const earningsQuery = trpc.monetization.earnings.useQuery();
  const withdrawalsQuery = trpc.monetization.withdrawals.useQuery();
  const requestWithdrawalMutation = trpc.monetization.requestWithdrawal.useMutation();

  const handleRequestWithdrawal = async () => {
    if (!withdrawalAmount) return;
    await requestWithdrawalMutation.mutateAsync({
      amount: withdrawalAmount,
      paymentMethod,
    });
    setWithdrawalAmount("");
    withdrawalsQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/feed")}
              className="text-purple-400 hover:text-purple-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <span className="text-xl font-bold text-white">{APP_TITLE}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold">Total Earnings</h3>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {statsQuery.data?.totalEarnings || "0"} {user?.currency || "USD"}
            </p>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold">Total Withdrawals</h3>
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {statsQuery.data?.totalWithdrawals || "0"} {user?.currency || "USD"}
            </p>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold">Available Balance</h3>
              <Wallet className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {(
                parseFloat(statsQuery.data?.totalEarnings?.toString() || "0") -
                parseFloat(statsQuery.data?.totalWithdrawals?.toString() || "0")
              ).toFixed(2)}{" "}
              {user?.currency || "USD"}
            </p>
          </div>
        </div>

        {/* Withdrawal Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Request Withdrawal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 font-semibold mb-2">
                  Amount ({user?.currency || "USD"})
                </label>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-semibold mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
                >
                  <option value="mtn_money">MTN Mobile Money</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="wave">Wave</option>
                  <option value="airtel_money">Airtel Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <Button
                onClick={handleRequestWithdrawal}
                disabled={!withdrawalAmount || requestWithdrawalMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2"
              >
                {requestWithdrawalMutation.isPending ? "Processing..." : "Request Withdrawal"}
              </Button>
            </div>
          </div>

          {/* Recent Withdrawals */}
          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Withdrawals</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {withdrawalsQuery.data && withdrawalsQuery.data.length > 0 ? (
                withdrawalsQuery.data.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-purple-800/30"
                  >
                    <div>
                      <p className="text-white font-semibold">
                        {withdrawal.amount} {user?.currency || "USD"}
                      </p>
                      <p className="text-sm text-purple-300">{withdrawal.paymentMethod}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        withdrawal.status === "completed"
                          ? "bg-green-900/30 text-green-400"
                          : withdrawal.status === "pending"
                          ? "bg-yellow-900/30 text-yellow-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {withdrawal.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-purple-300 text-center py-8">No withdrawals yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Earnings History */}
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Earnings History</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {earningsQuery.data && earningsQuery.data.length > 0 ? (
              earningsQuery.data.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-purple-800/30"
                >
                  <div>
                    <p className="text-white font-semibold">
                      +{earning.amount} {user?.currency || "USD"}
                    </p>
                    <p className="text-sm text-purple-300">
                      From {earning.source} {earning.videoId && `(Video #${earning.videoId})`}
                    </p>
                  </div>
                  <span className="text-sm text-purple-400">
                    {new Date(earning.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-purple-300 text-center py-8">No earnings yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
