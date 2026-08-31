import type { ReactNode } from "react";
import type { LiveLayoutId } from "./live-layouts";

type Participant = { userId: number; username: string; role: string; isMuted: boolean; isVideoOff: boolean };

type Props = {
  layout: LiveLayoutId;
  participants: Participant[];
  renderVideo: (participant: Participant) => ReactNode;
};

export function LiveStageLayout({ layout, participants, renderVideo }: Props) {
  const stage = participants.filter((p) => p.role === "host" || p.role === "guest" || p.role === "admin").slice(0, 100);
  if (!stage.length) return <div className="absolute inset-0 flex items-center justify-center bg-gray-950 text-white/50">La scène est vide</div>;

  const slot = (p: Participant) => (
    <div key={p.userId} className="relative min-h-24 overflow-hidden rounded-2xl border border-white/10 bg-gray-900/90">
      {renderVideo(p)}
      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-semibold truncate">
        {p.username}{p.role === "host" ? " · Hôte" : p.role === "admin" ? " · Admin" : ""}{p.isMuted ? " · Muet" : ""}
      </div>
    </div>
  );

  if (layout === "split") {
    return <div className="absolute inset-0 p-2 grid grid-cols-2 gap-2">{slot(stage[0])}{stage[1] ? slot(stage[1]) : <div className="rounded-2xl bg-gray-900/80 flex items-center justify-center text-white/40">Invité 2</div>}</div>;
  }

  if (layout === "grid") {
    return <div className="absolute inset-0 p-2 grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-fr overflow-auto">{stage.map(slot)}</div>;
  }

  if (layout === "focus") {
    const extras = stage.slice(1);
    return <div className="absolute inset-0 p-2 grid grid-cols-3 gap-2"><div className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl">{renderVideo(stage[0])}</div><div className="flex flex-col gap-2 overflow-auto">{extras.slice(0, 9).map(slot)}{!extras.length && <div className="flex-1 rounded-2xl bg-gray-900/80 flex items-center justify-center text-white/40">Invités</div>}</div></div>;
  }

  return <div className="absolute inset-0 p-2">{renderVideo(stage[0])}<div className="absolute bottom-24 right-3 w-28 max-h-[55vh] overflow-auto space-y-2">{stage.slice(1, 9).map(slot)}</div></div>;
}
