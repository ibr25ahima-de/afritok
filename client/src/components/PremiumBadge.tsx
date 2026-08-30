import { Crown } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function PremiumBadge({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = trpc.subscription.status.useQuery(undefined, { staleTime: 60_000 });
  if (isLoading || !data?.isPremium) return null;
  return <span title={data.expiresAt ? `Premium actif jusqu'au ${new Date(data.expiresAt).toLocaleDateString("fr-FR")}` : "Premium actif"} className={`inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/40 font-semibold ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"}`}><Crown size={compact ? 11 : 13} /> Premium</span>;
}
