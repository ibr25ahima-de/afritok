import { Check, Grid2X2, MicOff, Plus, UserRound, Users, X } from "lucide-react";

type Participant = { userId: number; username: string; role: string; isMuted: boolean; isVideoOff: boolean };
type StageRequest = { requestId: string; userId: number; username: string };

type Props = {
  isHost: boolean;
  participants: Participant[];
  requests: StageRequest[];
  maxParticipants: number;
  myRequestPending: boolean;
  onRequestStage: () => void;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onRemove: (userId: number) => void;
  onMute: (userId: number, muted: boolean) => void;
};

export function LiveStagePanel({ isHost, participants, requests, maxParticipants, myRequestPending, onRequestStage, onAccept, onReject, onRemove, onMute }: Props) {
  const stage = participants.filter((p) => p.role === "host" || p.role === "guest" || p.role === "admin");
  return (
    <section className="absolute left-3 right-3 top-24 z-20 pointer-events-auto">
      <div className="rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 p-3">
        <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 font-bold"><Grid2X2 size={17} /> Scène · {stage.length}/{maxParticipants + 1}</div>{!isHost && <button type="button" onClick={onRequestStage} disabled={myRequestPending} className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold disabled:opacity-50"><Plus size={14} className="inline mr-1" />{myRequestPending ? "Demande envoyée" : "Monter sur scène"}</button>}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{stage.map((p) => <div key={p.userId} className="rounded-xl bg-white/10 p-2 min-h-16"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"><UserRound size={16} /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{p.username}</p><p className="text-[10px] text-white/60">{p.role === "host" ? "Hôte" : p.role === "admin" ? "Admin" : "Invité"}</p></div>{p.isMuted && <MicOff size={13} />}</div>{isHost && p.role !== "host" && <div className="flex gap-1 mt-2"><button type="button" onClick={() => onMute(p.userId, !p.isMuted)} className="flex-1 rounded-lg bg-white/10 py-1 text-[10px]">{p.isMuted ? "Activer micro" : "Couper micro"}</button><button type="button" onClick={() => onRemove(p.userId)} className="rounded-lg bg-red-500/80 px-2 py-1 text-[10px]">Retirer</button></div>}</div>)}</div>
        {isHost && requests.length > 0 && <div className="mt-3 border-t border-white/10 pt-3"><div className="flex items-center gap-2 text-sm font-bold mb-2"><Users size={15} /> Demandes pour monter ({requests.length})</div>{requests.map((r) => <div key={r.requestId} className="flex items-center gap-2 rounded-xl bg-white/10 p-2 mb-2"><div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"><UserRound size={15} /></div><span className="text-sm flex-1 truncate">{r.username}</span><button type="button" onClick={() => onAccept(r.requestId)} className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center"><Check size={17} /></button><button type="button" onClick={() => onReject(r.requestId)} className="w-9 h-9 rounded-full bg-red-500/80 flex items-center justify-center"><X size={17} /></button></div>)}</div>}
      </div>
    </section>
  );
}
