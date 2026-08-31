import type { ReactNode } from "react";
import type { LiveLayoutId } from "./live-layouts";

type Participant = { userId: number; username: string; role: string; isMuted: boolean; isVideoOff: boolean; stageSlot?: number };
type Props = { layout: LiveLayoutId; participants: Participant[]; maxParticipants: number; renderVideo: (participant: Participant) => ReactNode; centerParticipantId?: number | null };
const MAX_RENDERED_SLOTS = 100;

export function LiveStageLayout({ layout, participants, maxParticipants, renderVideo, centerParticipantId }: Props) {
  const guestCapacity = Math.max(1, Math.min(MAX_RENDERED_SLOTS - 1, Number(maxParticipants) || 1));
  const capacity = guestCapacity + 1;
  const stage = participants.filter((p) => p.role === "host" || p.role === "guest" || p.role === "admin");
  const slots: Array<Participant | null> = Array.from({ length: capacity }, () => null);
  for (const participant of stage) {
    const preferred = participant.stageSlot;
    const slotIndex = preferred !== undefined && preferred >= 0 && preferred < capacity && !slots[preferred] ? preferred : slots.findIndex((slot) => slot === null);
    if (slotIndex >= 0) slots[slotIndex] = participant;
  }

  const emptySlot = (index: number, compact = false) => <div key={`empty-${index}`} className={`relative overflow-hidden rounded-xl border border-white/10 bg-gray-900/65 flex items-center justify-center text-center text-white/45 ${compact ? "min-h-12" : "min-h-16"}`}><div><div className="text-2xl font-light leading-none">+</div><div className="mt-0.5 text-[10px] font-semibold">Inviter</div></div></div>;
  const slot = (p: Participant | null, index: number, compact = false) => p ? <div key={`participant-${p.userId}`} className={`relative overflow-hidden rounded-xl border border-white/10 bg-gray-900/90 ${compact ? "min-h-12" : "min-h-16"}`}>{renderVideo(p)}<div className="absolute bottom-1 left-1 right-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold truncate">{p.username}{p.role === "host" ? " · Hôte" : p.role === "admin" ? " · Admin" : ""}{p.isMuted ? " · Muet" : ""}</div></div> : emptySlot(index, compact);

  // Legacy LiveRoom sessions can still report the old spotlight state. For 20+ guest
  // capacity, the required production stage is the centered-host layout: half left,
  // host/selected-center, half right. Other explicit layouts remain unchanged.
  if (layout === "host-center" || (layout === "spotlight" && guestCapacity >= 20)) {
    const center = centerParticipantId ? stage.find((p) => p.userId === centerParticipantId) || stage.find((p) => p.role === "host") : stage.find((p) => p.role === "host");
    const centerId = center?.userId;
    const side = slots.filter((p): p is Participant => !!p && p.userId !== centerId);
    const splitLarge = guestCapacity >= 20;
    const leftCount = splitLarge ? Math.ceil(guestCapacity / 2) : guestCapacity;
    const rightCount = splitLarge ? guestCapacity - leftCount : 0;
    const left = Array.from({ length: leftCount }, (_, i) => side[i] || null);
    const right = splitLarge ? Array.from({ length: rightCount }, (_, i) => side[leftCount + i] || null) : [];
    return <div className={`absolute inset-0 p-1.5 grid ${splitLarge ? "grid-cols-[22%_56%_22%]" : "grid-cols-[0_78%_22%]"} gap-1.5 overflow-hidden bg-black/10`}>
      <div className={`grid gap-1.5 min-h-0 overflow-hidden ${splitLarge ? "grid-rows-[repeat(10,minmax(0,1fr))]" : "hidden"}`}>{left.map((p, i) => slot(p, i, true))}</div>
      <div className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-gray-950/30">{center ? <div className="w-full h-full">{renderVideo(center)}</div> : emptySlot(-1)}</div>
      <div className="grid gap-1.5 min-h-0 overflow-hidden grid-rows-[repeat(10,minmax(0,1fr))]">{(splitLarge ? right : left).map((p, i) => slot(p, i, true))}</div>
    </div>;
  }
  if (layout === "grid") return <div className="absolute inset-0 p-2 grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-fr overflow-y-auto">{slots.map((p, i) => slot(p, i))}</div>;
  if (layout === "split") return <div className="absolute inset-0 p-2 grid grid-cols-2 gap-2 overflow-y-auto">{slots.map((p, i) => slot(p, i))}</div>;
  if (layout === "focus") { const main = slots[0]; const side = slots.slice(1); return <div className="absolute inset-0 p-2 grid grid-cols-3 gap-2 overflow-hidden"><div className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl">{main ? renderVideo(main) : emptySlot(0)}</div><div className="flex flex-col gap-2 overflow-y-auto">{side.map((p, i) => slot(p, i + 1, true))}</div></div>; }
  return <div className="absolute inset-0 p-2">{mainVideo(slots[0], renderVideo, emptySlot)}<div className="absolute bottom-24 right-3 w-28 max-h-[55vh] overflow-y-auto space-y-2">{slots.slice(1).map((p, i) => slot(p, i + 1, true))}</div></div>;
}
function mainVideo(participant: Participant | null, renderVideo: Props["renderVideo"], emptySlot: (index: number, compact?: boolean) => ReactNode) { if (participant) return <div className="relative w-full h-full overflow-hidden rounded-2xl">{renderVideo(participant)}</div>; return <div className="w-full h-full">{emptySlot(0)}</div>; }
