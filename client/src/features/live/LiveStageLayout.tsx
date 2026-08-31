import type { ReactNode } from "react";
import type { LiveLayoutId } from "./live-layouts";

type Participant = { userId: number; username: string; role: string; isMuted: boolean; isVideoOff: boolean; stageSlot?: number };

type Props = { layout: LiveLayoutId; participants: Participant[]; maxParticipants: number; renderVideo: (participant: Participant) => ReactNode; };

const MAX_RENDERED_SLOTS = 100;

export function LiveStageLayout({ layout, participants, maxParticipants, renderVideo }: Props) {
  const capacity = Math.max(1, Math.min(MAX_RENDERED_SLOTS, Number(maxParticipants) || 1));
  const stage = participants.filter((p) => p.role === "host" || p.role === "guest" || p.role === "admin");
  const slots: Array<Participant | null> = Array.from({ length: capacity }, () => null);
  for (const participant of stage) {
    const preferred = participant.stageSlot;
    const slotIndex = preferred !== undefined && preferred >= 0 && preferred < capacity && !slots[preferred] ? preferred : slots.findIndex((slot) => slot === null);
    if (slotIndex >= 0) slots[slotIndex] = participant;
  }

  const emptySlot = (index: number, compact = false) => (
    <div key={`empty-${index}`} className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/75 flex items-center justify-center text-center text-white/45 ${compact ? "min-h-20" : "min-h-24"}`}>
      <div><div className="text-3xl font-light leading-none">+</div><div className="mt-1 text-xs font-semibold">Inviter</div></div>
    </div>
  );

  const slot = (p: Participant | null, index: number, compact = false) => p ? (
    <div key={`participant-${p.userId}`} className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/90 ${compact ? "min-h-20" : "min-h-24"}`}>
      {renderVideo(p)}
      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-semibold truncate">{p.username}{p.role === "host" ? " · Hôte" : p.role === "admin" ? " · Admin" : ""}{p.isMuted ? " · Muet" : ""}</div>
    </div>
  ) : emptySlot(index, compact);

  if (layout === "grid") return <div className="absolute inset-0 p-2 grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-fr overflow-y-auto">{slots.map((p, i) => slot(p, i))}</div>;

  if (layout === "split") {
    return <div className="absolute inset-0 p-2 grid grid-cols-2 gap-2 overflow-y-auto">{slots.map((p, i) => slot(p, i))}</div>;
  }

  if (layout === "focus") {
    const main = slots[0];
    const side = slots.slice(1);
    return <div className="absolute inset-0 p-2 grid grid-cols-3 gap-2 overflow-hidden">
      <div className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl">{main ? renderVideo(main) : emptySlot(0)}</div>
      <div className="flex flex-col gap-2 overflow-y-auto">{side.map((p, i) => slot(p, i + 1, true))}</div>
    </div>;
  }

  return <div className="absolute inset-0 p-2">
    {mainVideo(slots[0], renderVideo, emptySlot)}
    <div className="absolute bottom-24 right-3 w-28 max-h-[55vh] overflow-y-auto space-y-2">{slots.slice(1).map((p, i) => slot(p, i + 1, true))}</div>
  </div>;
}

function mainVideo(participant: Participant | null, renderVideo: Props["renderVideo"], emptySlot: (index: number, compact?: boolean) => ReactNode) {
  if (participant) return <div className="relative w-full h-full overflow-hidden rounded-2xl">{renderVideo(participant)}</div>;
  return <div className="w-full h-full">{emptySlot(0)}</div>;
}
