import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Download } from "lucide-react";

export default function Balance() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // PROBLÈME 1 & 2 : Utiliser fetch pour les gains car le router n'existe pas
  const earningsQuery = trpc.useQuery(["custom.earnings"], {
    queryFn: async () => {
      const res = await fetch("/api/user/earnings", {
        credentials: "include",
      });
      return res.json();
    },
  });

  // PROBLÈME 3 : Appel au nouveau backend getHistory
  const withdrawalsQuery = trpc.instantWithdrawal.getHistory.useQuery();

  // Formatage des données selon le retour du backend
  const totalEarnings = earningsQuery.data?.total || 0;
  
  const totalWithdrawn = withdrawalsQuery.data
    ? withdrawalsQuery.data.reduce((sum: number, w: any) => sum + parseFloat(w.amount), 0)
    : 0;

  // PROBLÈME 5 : Le solde disponible est égal au totalEarnings car la DB est déjà déduite
  const availableBalance = totalEarnings;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/profile/" + user?.id)}
          className="text-white hover:text-gray-300 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold flex-1">Solde</h1>
      </header>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-6">
        {/* BALANCE CARDS */}
        <div className="space-y-3">
          {/* TOTAL EARNINGS */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6">
            <p className="text-gray-200 text-sm mb-2">Revenus totaux</p>
            <h2 className="text-3xl font-bold">${totalEarnings.toFixed(2)}</h2>
          </div>

          {/* WITHDRAWN */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-6">
            <p className="text-gray-300 text-sm mb-2">Retraits effectués</p>
            <h2 className="text-3xl font-bold">${totalWithdrawn.toFixed(2)}</h2>
          </div>

          {/* AVAILABLE */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-6">
            <p className="text-gray-200 text-sm mb-2">Solde disponible</p>
            <h2 className="text-3xl font-bold">${availableBalance.toFixed(2)}</h2>
          </div>
        </div>

        {/* WITHDRAWAL BUTTON */}
        <button
          onClick={() => navigate("/instant-withdraw")}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Faire un retrait
        </button>

        {/* WITHDRAWAL HISTORY */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-lg">Historique des retraits</h3>
          
          {withdrawalsQuery.data && withdrawalsQuery.data.length > 0 ? (
            withdrawalsQuery.data.map((withdrawal: any) => (
              <div key={withdrawal.id} className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    {/* PROBLÈME 4 : Utiliser paymentMethod au lieu de provider */}
                    <p className="text-white font-semibold">{withdrawal.paymentMethod}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${parseFloat(withdrawal.amount).toFixed(2)}</p>
                    <p className={`text-xs font-semibold ${
                      withdrawal.status === 'completed' ? 'text-green-400' :
                      withdrawal.status === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {withdrawal.status === 'completed' ? '✅ Complété' :
                       withdrawal.status === 'pending' ? '⏳ En attente' :
                       '❌ Échoué'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-900/50 rounded-lg p-6 text-center">
              <p className="text-gray-400">Aucun retrait effectué</p>
            </div>
          )}
        </div>

        {/* EARNINGS HISTORY */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-lg">Historique des gains</h3>
          
          {earningsQuery.data?.history && earningsQuery.data.history.length > 0 ? (
            earningsQuery.data.history.slice(0, 10).map((earning: any) => (
              <div key={earning.id} className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold capitalize">{earning.source}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(earning.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-green-400 font-bold">+${parseFloat(earning.amount).toFixed(2)}</p>
              </div>
            ))
          ) : (
            <div className="bg-gray-900/50 rounded-lg p-6 text-center">
              <p className="text-gray-400">Aucun gain enregistré</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
