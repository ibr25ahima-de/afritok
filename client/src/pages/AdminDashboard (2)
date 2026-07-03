import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ArrowLeft, Users, Video, TrendingUp, CheckCircle, Music, RefreshCw } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: withdrawals, refetch } = trpc.admin.getAllWithdrawals.useQuery();
  const markPaid = trpc.admin.markWithdrawalPaid.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (user?.role !== "admin") {
    navigate("/feed");
    return null;
  }

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
          <span className="text-purple-400 font-semibold">Admin Dashboard</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold">Total Users</h3>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">--</p>
            <p className="text-sm text-purple-300 mt-2">Coming soon</p>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold">Total Videos</h3>
              <Video className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">--</p>
            <p className="text-sm text-purple-300 mt-2">Coming soon</p>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-300 font-semibold">Total Payouts</h3>
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">--</p>
            <p className="text-sm text-purple-300 mt-2">Coming soon</p>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* ✅ NOUVELLE SECTION : Gestion des musiques */}
          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Music className="w-6 h-6 text-purple-400" />
              Music Library
            </h2>
            <div className="space-y-3">
              <p className="text-purple-300 mb-4">Manage audio tracks and library synchronization</p>
              <button
                onClick={() => navigate("/admin/music")}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw className="w-5 h-5" />
                Synchroniser la bibliothèque
              </button>
            </div>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
            <div className="space-y-3">
              <p className="text-purple-300 mb-4">Manage user accounts and permissions</p>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center text-purple-300">
                <p>Feature coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Content Moderation</h2>
            <div className="space-y-3">
              <p className="text-purple-300 mb-4">Review and moderate user-generated content</p>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center text-purple-300">
                <p>Feature coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Analytics</h2>
            <div className="space-y-3">
              <p className="text-purple-300 mb-4">View platform statistics and insights</p>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center text-purple-300">
                <p>Feature coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 md:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Payment Management</h2>
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
                              onClick={() => markPaid.mutate({ withdrawalId: withdrawal.id })}
                              disabled={markPaid.isPending}
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
        </div>
      </div>
    </div>
  );
}
