import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, BarChart3 } from "lucide-react";
import { MonetizationProgressBar } from "@/components/MonetizationProgressBar";

interface Earning {
  id: number;
  userId: number;
  amount: string;
  source: string;
  videoId: number | null;
  createdAt: string;
}

export default function AfritokStudio() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const earningsQuery = trpc.earnings.getMyEarnings.useQuery();

  // Calculate earnings by source
  const earningsBySource: Record<string, { total: number; count: number }> = {};
  if (earningsQuery.data && Array.isArray(earningsQuery.data)) {
    (earningsQuery.data as Earning[]).forEach((earning) => {
      if (!earningsBySource[earning.source]) {
        earningsBySource[earning.source] = { total: 0, count: 0 };
      }
      earningsBySource[earning.source].total += parseFloat(earning.amount);
      earningsBySource[earning.source].count += 1;
    });
  }

  const totalEarnings = Object.values(earningsBySource).reduce((sum, item) => sum + item.total, 0);

  const revenueSources = [
    { id: 'views', name: 'Vues vidéo', icon: '👁️', description: 'Basé sur les vues' },
    { id: 'likes', name: 'Likes', icon: '❤️', description: 'Gagné par les likes' },
    { id: 'shares', name: 'Partages', icon: '↗️', description: 'Par partages' },
    { id: 'comments', name: 'Commentaires', icon: '💬', description: 'Par commentaires' },
    { id: 'gifts', name: 'Cadeaux en direct', icon: '🎁', description: 'Cadeaux live' },
    { id: 'sponsorship', name: 'Sponsorisation', icon: '🤝', description: 'Contrats' },
    { id: 'creator_fund', name: 'Fonds créateurs', icon: '💰', description: 'Programme' },
    { id: 'auto_earn', name: 'Système automatique', icon: '⚡', description: 'Automatique' }
  ];

  // Monetization conditions
  const conditions = [
    { id: 'followers', label: 'Abonnés', current: 0, required: 10, unit: 'followers' },
    { id: 'views', label: 'Vues (30j)', current: 0, required: 1000, unit: 'vues' },
    { id: 'videos', label: 'Vidéos', current: 0, required: 3, unit: 'vidéos' }
  ];

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
        <h1 className="text-lg font-bold flex-1">Afritok Studio</h1>
      </header>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-6">
        {/* TOTAL EARNINGS */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-center">
          <p className="text-gray-200 text-sm mb-2">Revenus totaux</p>
          <h2 className="text-4xl font-bold mb-2">${totalEarnings.toFixed(2)}</h2>
          <p className="text-gray-100 text-xs">Mis à jour en temps réel</p>
        </div>

        {/* MONETIZATION PROGRESS */}
        <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-white font-bold mb-4">Conditions de monétisation</h3>
          <MonetizationProgressBar 
            conditions={conditions}
            isEligible={false}
          />
        </div>

        {/* REVENUE SOURCES */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-lg">Sources de revenus</h3>
          
          {revenueSources.map((source) => {
            const earning = earningsBySource[source.id];
            const amount = earning ? earning.total : 0;
            const count = earning ? earning.count : 0;

            return (
              <div key={source.id} className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{source.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{source.name}</p>
                    <p className="text-gray-400 text-sm">{source.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">${amount.toFixed(2)}</p>
                  <p className="text-gray-400 text-xs">{count} transactions</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* PERFORMANCE STATS */}
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
          <h3 className="text-white font-bold flex items-center gap-2">
            <BarChart3 size={20} />
            Statistiques de performance
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/50 rounded p-3">
              <p className="text-gray-400 text-sm">Revenus ce mois</p>
              <p className="text-white font-bold text-lg">${totalEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-black/50 rounded p-3">
              <p className="text-gray-400 text-sm">Total transactions</p>
              <p className="text-white font-bold text-lg">
                {Object.values(earningsBySource).reduce((sum, item) => sum + item.count, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* RETRAIT BUTTON */}
        <button
          onClick={() => navigate("/instant-withdraw")}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition"
        >
          💸 Retirer l'argent
        </button>
      </div>
    </div>
  );
}
