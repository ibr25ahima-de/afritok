import { trpc } from "@/lib/trpc";
import { Radio } from "lucide-react";
import { useLocation } from "wouter";

type LiveStatusBadgeProps = { userId: number; className?: string };

export function LiveStatusBadge({ userId, className = "" }: LiveStatusBadgeProps) {
  const [, navigate] = useLocation();
  const { data: sessions } = trpc.live.getPublicSessions.useQuery(undefined, {
    refetchInterval: 2000,
    staleTime: 0,
  });
  const session = sessions?.find((item) => item.hostId === userId);
  if (!session) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        navigate(`/live/${session.sessionId}`);
      }}
      aria-label={`Rejoindre le Live de ${session.hostUsername}`}
      className={`inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-lg ${className}`}
    >
      <Radio size={12} fill="currentColor" />
      LIVE
    </button>
  );
}
