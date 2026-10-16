import type { ReactNode } from "react";
import type { LiveLayoutId } from "./live-layouts";

type Participant = { userId: number; username: string; role: string; isMuted: boolean; isVideoOff: boolean; stageSlot?: number };
type Props = { layout: LiveLayoutId; participants: Participant[]; maxParticipants: number; renderVideo: (participant: Participant) => ReactNode; centerParticipantId?: number | null; onRequestStage?: () => void; canRequestStage?: boolean; requestPending?: boolean; leftGuestSlots?: number };
const MAX_RENDERED_SLOTS = 100;

export function LiveStageLayout({ layout, participants, maxParticipants, renderVideo, centerParticipantId, onRequestStage, canRequestStage = false, requestPending = false, leftGuestSlots }: Props) {
  const guestCapacity = Math.max(1, Math.min(MAX_RENDERED_SLOTS - 1, Number(maxParticipants) || 1));
  const capacity = guestCapacity + 1;
  const stage = participants.filter((p) => p.role === "host" || p.role === "guest" || p.role === "admin");
  const slots: Array<Participant | null> = Array.from({ length: capacity }, () => null);
  for (const participant of stage) {
    const preferred = participant.stageSlot;
    const slotIndex = preferred !== undefined && preferred >= 0 && preferred < capacity && !slots[preferred] ? preferred : slots.findIndex((slot) => slot === null);
    if (slotIndex >= 0) slots[slotIndex] = participant;
  }

  const emptySlot = (index: number, compact = false) => <button type="button" key={`empty-${index}`} disabled={!canRequestStage || requestPending} onClick={onRequestStage} aria-label={`Place ${index + 1} libre sur la scène${canRequestStage ? " : demander à monter" : ""}`} className={`relative overflow-hidden rounded-xl border border-white/20 bg-gray-900/75 flex flex-col items-center justify-center text-center text-white/70 ${compact ? "min-h-12" : "min-h-16"} ${canRequestStage && !requestPending ? "cursor-pointer hover:bg-gray-800/90" : "cursor-default"}`}><span className="text-xl font-light leading-none">+</span><span className="mt-0.5 text-[10px] font-semibold">Place {index + 1}</span><span className="text-[9px]">{requestPending && canRequestStage ? "Demande envoyée" : canRequestStage ? "Rejoindre" : "Libre"}</span></button>;
  const slot = (p: Participant | null, index: number, compact = false) => p ? <div key={`participant-${p.userId}`} className={`relative overflow-hidden rounded-xl border border-white/10 bg-gray-900/90 ${compact ? "min-h-12" : "min-h-16"}`}>{renderVideo(p)}<div className="absolute bottom-1 left-1 right-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold truncate">{p.username}{p.role === "host" ? " · Hôte" : p.role === "admin" ? " · Admin" : ""}{p.isMuted ? " · Muet" : ""}</div></div> : emptySlot(index, compact);

  // In host-centered mode every empty guest slot stays visible on the LIVE stage.
  if (layout === "host-center" || (layout === "spotlight" && guestCapacity >= 10)) {
    const center = centerParticipantId ? stage.find((p) => p.userId === centerParticipantId) || stage.find((p) => p.role === "host") : stage.find((p) => p.role === "host");
    const side = slots.filter((p) => !p || p.userId !== center?.userId);
    const defaultLeft = guestCapacity >= 10 ? Math.floor(guestCapacity / 2) : 0;
    const leftCount = Math.max(0, Math.min(guestCapacity, leftGuestSlots ?? defaultLeft));
    const rightCount = guestCapacity - leftCount;
    const left = side.slice(0, leftCount);
    const right = side.slice(leftCount, leftCount + rightCount);
    const column = (items: Array<Participant | null>, offset: number) => <div className="h-full min-h-0 overflow-y-auto flex flex-col gap-1.5 pb-24">{items.map((p, i) => <div key={i} className="shrink-0 h-[min(13vh,90px)] min-h-[48px]">{slot(p, offset + i + 1, true)}</div>)}</div>;
    return <div className="absolute inset-0 p-1.5 flex gap-1.5 bg-black/10">
      {leftCount > 0 && <div className="w-[23%] shrink-0 min-w-0">{column(left, 0)}</div>}
      <div className="relative flex-1 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gray-950/30">{center ? renderVideo(center) : emptySlot(0)}</div>
      {rightCount > 0 && <div className="w-[23%] shrink-0 min-w-0">{column(right, leftCount)}</div>}
    </div>;
  }
  if (layout === "grid") return <div className="absolute inset-0 p-2 grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-fr overflow-y-auto">{slots.map((p, i) => slot(p, i))}</div>;
  if (layout === "split") return <div className="absolute inset-0 p-2 grid grid-cols-2 gap-2 overflow-y-auto">{slots.map((p, i) => slot(p, i))}</div>;
  if (layout === "focus") { const main = slots[0]; const side = slots.slice(1); return <div className="absolute inset-0 p-2 grid grid-cols-3 gap-2 overflow-hidden"><div className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl">{main ? renderVideo(main) : emptySlot(0)}</div><div className="flex flex-col gap-2 overflow-y-auto">{side.map((p, i) => slot(p, i + 1, true))}</div></div>; }
  const spotlightMain = centerParticipantId ? stage.find((p) => p.userId === centerParticipantId) || slots[0] : slots[0]; const spotlightSide = slots.filter((p) => !p || p.userId !== spotlightMain?.userId); return <div className="absolute inset-0 p-2 flex gap-2"><div className="relative flex-1 min-w-0 h-full">{mainVideo(spotlightMain, renderVideo, emptySlot)}</div><div className="relative w-[30%] min-w-[90px] max-w-[150px] h-full overflow-y-auto grid content-start gap-1.5 pb-24" style={{ gridTemplateRows: `repeat(${spotlightSide.length}, minmax(3.5rem, auto))` }}>{spotlightSide.map((p, i) => slot(p, i + 1, true))}</div></div>;
}
function mainVideo(participant: Participant | null, renderVideo: Props["renderVideo"], emptySlot: (index: number, compact?: boolean) => ReactNode) { if (participant) return <div className="relative w-full h-full overflow-hidden rounded-2xl">{renderVideo(participant)}</div>; return <div className="w-full h-full">{emptySlot(0)}</div>; }
