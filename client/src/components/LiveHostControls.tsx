import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Crown, MicOff, Settings2, UserMinus, UserPlus, Users, Video, VideoOff, X } from "lucide-react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const CAPACITY_OPTIONS = [1, 2, 3, 5, 8, 10, 12, 15, 20, 30, 50, 100];

export default function LiveHostControls() {
  const [, params] = useRoute("/live/:sessionId");
  const sessionId = params?.sessionId || "";
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [capacity, setCapacity] = useState(5);
  const { data: me } = trpc.auth.me.useQuery();
  const { data: session } = trpc.live.getSession.useQuery({ sessionId }, { enabled: !!sessionId, refetchInterval: 4000 });
  const participantsQuery = trpc.live.getParticipants.useQuery({ sessionId }, { enabled: !!sessionId, refetchInterval: 3000 });
  const setCapacityMutation = trpc.live.setStageCapacity.useMutation();
  const promote = trpc.live.promoteToStage.useMutation();
  const removeStage = trpc.live.removeFromStage.useMutation();
  const mute = trpc.live.muteParticipant.useMutation();
  const remove = trpc.live.removeParticipant.useMutation();
  const addAdmin = trpc.live.addLiveAdmin.useMutation();
  const removeAdmin = trpc.live.removeLiveAdmin.useMutation();

  const isHost = !!me && !!session && session.hostId === me.id;
  const stage = useMemo(() => participants.filter((p) => p.role === "guest" || p.role === "admin"), [participants]);

  useEffect(() => { if (participantsQuery.data) setParticipants(participantsQuery.data); }, [participantsQuery.data]);
  useEffect(() => { if (session?.maxParticipants) setCapacity(session.maxParticipants); }, [session?.maxParticipants]);

  useEffect(() => {
    if (!sessionId) return;
    const socket: Socket = io(window.location.origin, { transports: ["websocket", "polling"] });
    socket.on("live:participants", ({ participants: list }) => setParticipants(list || []));
    return () => socket.disconnect();
  }, [sessionId]);

  if (!sessionId || !isHost) return null;

  const run = async (fn: () => Promise<unknown>) => { try { await fn(); participantsQuery.refetch(); } catch {} };

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed right-4 top-20 z-[80] w-11 h-11 rounded-full bg-black/65 border border-white/20 flex items-center justify-center" aria-label="Contrôler le Live">
        <Settings2 size={20} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-3xl bg-gray-950 border border-gray-800 p-5 text-white">
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="font-bold text-lg">Contrôle du Live</h2><p className="text-xs text-gray-400">Toi seul contrôles la scène.</p></div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center"><X size={18} /></button>
            </div>

            <div className="rounded-2xl bg-gray-900 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3"><Users size={18} /><span className="font-semibold">Places sur scène</span></div>
              <div className="grid grid-cols-4 gap-2">
                {CAPACITY_OPTIONS.map((n) => <button key={n} onClick={() => run(async () => { await setCapacityMutation.mutateAsync({ sessionId, maxParticipants: n }); setCapacity(n); })} className={`py-2 rounded-xl text-sm font-semibold ${capacity === n ? "bg-red-500" : "bg-gray-800"}`}>{n}</button>)}
              </div>
              <p className="text-xs text-gray-500 mt-2">Choisis 5, 10, 12 personnes ou toute autre capacité.</p>
            </div>

            <div className="space-y-2">
              {participants.filter((p) => p.userId !== me.id).map((p) => {
                const onStage = p.role === "guest" || p.role === "admin";
                const admin = p.role === "admin";
                return <div key={p.userId} className="rounded-2xl bg-gray-900 p-3">
                  <div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="font-semibold truncate">@{p.username}</p><p className="text-xs text-gray-500">{admin ? "Administrateur Live" : onStage ? "Sur scène" : "Spectateur"}</p></div><div className="flex gap-1">
                    {!onStage && <button title="Faire monter" onClick={() => run(() => promote.mutateAsync({ sessionId, userId: p.userId }))} className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center"><UserPlus size={16} /></button>}
                    {onStage && <button title="Faire descendre" onClick={() => run(() => removeStage.mutateAsync({ sessionId, userId: p.userId }))} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><UserMinus size={16} /></button>}
                    {onStage && <button title={p.isMuted ? "Réactiver le micro" : "Couper le micro"} onClick={() => run(() => mute.mutateAsync({ sessionId, userId: p.userId, muted: !p.isMuted }))} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">{p.isMuted ? <MicOff size={16} /> : <Video size={16} />}</button>}
                    {!admin && <button title="Nommer admin Live" onClick={() => run(() => addAdmin.mutateAsync({ sessionId, userId: p.userId }))} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><Crown size={16} /></button>}
                    {admin && <button title="Retirer admin Live" onClick={() => run(() => removeAdmin.mutateAsync({ sessionId, userId: p.userId }))} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><Crown size={16} /></button>}
                    <button title="Expulser" onClick={() => run(() => remove.mutateAsync({ sessionId, userId: p.userId }))} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"><X size={16} /></button>
                  </div></div>
                  {onStage && <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">{p.isVideoOff ? <VideoOff size={14} /> : <Video size={14} />} {p.isVideoOff ? "Caméra coupée" : "Vidéo active"} · {p.isMuted ? "Micro coupé" : "Micro actif"}</div>}
                </div>;
              })}
              {participants.filter((p) => p.userId !== me.id).length === 0 && <p className="text-center text-gray-500 py-5">Aucun spectateur pour le moment.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
