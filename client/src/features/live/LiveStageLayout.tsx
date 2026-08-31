import type { ReactNode } from "react";
import type { LiveLayoutId } from "./live-layouts";

type Participant = { userId: number; username: string; role: string; isMuted: boolean; isVideoOff: boolean };

type Props = {
  layout: LiveLayoutId;
  participants: Participant[];
  video: ReactNode;
};

export function LiveStageLayout({ layout, participants, video }: Props) {
  const stage = participants.filter((p) => p.role === "host" || p.role === "guest" || p.role === "admin");
  const extras = stage.slice(1, 5);
  const slot = (p: Participant) => (
    <div key={p.userId} className="relative min-h-24 overflow-hidden rounded-2xl border border-white/10 bg-gray-900/90">
      <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm font-semibold">{p.isVideoOff ? "Caméra désactivée" : "Vidéo en attente..."}</div>
      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-semibold truncate">{p.username}{p.role === "host" ? " · Hôte" : ""}</div>
    </div>
  );

  if (layout === "split") {
    return <div className="absolute inset-0 p-2 grid grid-cols-2 gap-2">{video}{extras[0] ? slot(extras[0]) : <div className="rounded-2xl bg-gray-900/80 flex items-center justify-center text-white/40">Invité 2</div>}</div>;
  }

  if (layout === "grid") {
    return <div className="absolute inset-0 p-2 grid grid-cols-2 grid-rows-2 gap-2">{video}{extras.slice(0, 3).map(slot)}</div>;
  }

  if (layout === "focus") {
    return <div className="absolute inset-0 p-2 grid grid-cols-3 gap-2"><div className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl">{video}</div><div className="flex flex-col gap-2">{extras.slice(0, 3).map(slot)}{!extras.length && <div className="flex-1 rounded-2xl bg-gray-900/80 flex items-center justify-center text-white/40">Invités</div>}</div></div>;
  }

  return <div className="absolute inset-0 p-2">{video}<div className="absolute bottom-24 right-3 w-28 space-y-2">{extras.slice(0, 3).map(slot)}</div></div>;
}
