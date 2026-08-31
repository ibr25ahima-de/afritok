import { useLocation } from "wouter";
import { Eye, Radio, Users, Video } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function LiveLobby() {
  const [, navigate] = useLocation();
  const { data: lives, isLoading } = trpc.live.getPublicSessions.useQuery(undefined, {
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <header className="flex items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2"><Radio className="text-red-500" size={22} /><h1 className="text-2xl font-bold">Lives en direct</h1></div>
          <p className="text-sm text-gray-400 mt-1">Les Lives publics apparaissent automatiquement ici.</p>
        </div>
        <button type="button" onClick={() => navigate("/live/create")} className="rounded-full bg-red-500 px-4 py-2 font-bold">Passer en Live</button>
      </header>

      {isLoading && <div className="rounded-2xl bg-gray-900 border border-white/10 p-5 text-gray-400">Recherche des Lives en cours...</div>}

      {!isLoading && (!lives || lives.length === 0) && (
        <div className="rounded-3xl bg-gray-900 border border-white/10 p-8 text-center">
          <Video className="mx-auto mb-3 text-gray-500" size={40} />
          <h2 className="font-bold text-lg">Aucun Live en cours</h2>
          <p className="text-sm text-gray-400 mt-1">Quand quelqu'un démarre un Live public, il apparaîtra ici.</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {lives?.map((live) => (
          <button key={live.sessionId} type="button" onClick={() => navigate(`/live/${live.sessionId}`)} className="text-left rounded-3xl bg-gray-900 border border-white/10 p-5 hover:border-red-500/50 active:scale-[.99] transition">
            <div className="flex items-start justify-between gap-3">
              <div><div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 text-red-300 px-2.5 py-1 text-xs font-bold"><span className="animate-pulse">●</span> LIVE</div><h2 className="mt-3 font-bold text-lg line-clamp-2">{live.title}</h2><p className="text-sm text-gray-400 mt-1">@{live.hostUsername}</p></div>
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center"><Video size={22} /></div>
            </div>
            <div className="mt-5 flex items-center gap-5 text-sm text-gray-300"><span className="flex items-center gap-1"><Eye size={16} /> {live.viewerCount}</span><span className="flex items-center gap-1"><Users size={16} /> {live.participantCount}/{live.maxParticipants}</span></div>
            <div className="mt-4 rounded-2xl bg-red-500 py-3 text-center font-bold">Regarder le Live et demander à monter</div>
          </button>
        ))}
      </section>
    </main>
  );
}
