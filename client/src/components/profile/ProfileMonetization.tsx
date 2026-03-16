import { MonetizationProgressBar } from "@/components/MonetizationProgressBar";
import { Flame } from "lucide-react";

interface ProfileMonetizationProps {
  isOwnProfile: boolean;
  showMonetization: boolean;
  onMonetizationToggle: (show: boolean) => void;
  totalEarnings: number;
  revenueSources: any[];
}

export default function ProfileMonetization({
  isOwnProfile,
  showMonetization,
  onMonetizationToggle,
  totalEarnings,
  revenueSources,
}: ProfileMonetizationProps) {
  if (!isOwnProfile) return null;

  return (
    <>
      {/* MONETIZATION SECTION */}
      <div className="px-4 py-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-red-500" />
            <h3 className="font-bold text-lg">Afritok Studio</h3>
          </div>
          <button
            onClick={() => onMonetizationToggle(true)}
            className="text-red-500 hover:text-red-400 text-sm font-semibold"
          >
            Voir détails →
          </button>
        </div>

        <MonetizationProgressBar />

        <p className="text-gray-400 text-sm mt-4">
          Revenus totaux: <span className="text-white font-bold">${totalEarnings.toFixed(2)}</span>
        </p>
      </div>

      {/* MONETIZATION MODAL */}
      {showMonetization && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Sources de revenus</h2>
              <button
                onClick={() => onMonetizationToggle(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {revenueSources.map((source) => (
                <div key={source.id} className="bg-black/50 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{source.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">{source.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{source.description}</p>
                      <div className="space-y-1">
                        {source.conditions.map((condition: string, idx: number) => (
                          <p key={idx} className="text-gray-500 text-xs flex items-center gap-2">
                            <span className="text-green-500">✓</span> {condition}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
