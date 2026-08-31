import { trpc } from "@/lib/trpc";
import { Radio } from "lucide-react";
import { useLocation } from "wouter";

export function ActiveLiveStrip() {
  const [, navigate] = useLocation();
  const { data: sessions = [] } = trpc.live.getPublicSessions.useQuery(undefined, {
    refetchInterval: 2000,
    staleTime: 0,
  });
  if (!sessions.length) return null;

  return (
    <div className="absolute top-16 left-0 right-0 z-[55] px-3 pointer-events-none">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-1">
        {sessions.map((session) => (
          <button
            key={session.sessionId}
            type="button"
            onClick={() => navigate(`/live/${session.sessionId}`)}
            className="shrink-0 flex items-center gap-2 rounded-full border border-red-400/50 bg-black/75 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-md"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[10px] font-black">
              {(session.hostUsername || "U").slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-[110px] truncate text-xs font-bold">{session.hostUsername}</span>
            <span className="flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black"><Radio size={9} fill="currentColor" />LIVE</span>
          </button>
        ))}
      </div>
    </div>
  );
}
