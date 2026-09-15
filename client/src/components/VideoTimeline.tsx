import { useState } from "react";
import { Scissors } from "lucide-react";
import { ClipEditorFixed } from "@/components/ClipEditorFixed";

type Range = { start: number; end: number };

type Props = {
  src: string;
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  cuts: Range[];
  onCurrentTimeChange: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
  onCutsChange: (cuts: Range[]) => void;
  onDurationChange: (duration: number) => void;
};

/**
 * The main editor needs one obvious control to enter the real clip editor.
 * The old component hid this area completely, which made the timeline
 * impossible to activate on a phone.
 */
export function VideoTimeline({
  src,
  duration,
  trimStart,
  trimEnd,
  cuts,
  onCurrentTimeChange,
  onTrimChange,
  onCutsChange,
  onDurationChange,
}: Props) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <ClipEditorFixed
        src={src}
        duration={duration}
        trimStart={trimStart}
        trimEnd={trimEnd}
        cuts={cuts}
        onTrimChange={onTrimChange}
        onCutsChange={onCutsChange}
        onCurrentTimeChange={onCurrentTimeChange}
        onClose={() => setOpen(false)}
      />
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-lg active:scale-95"
        aria-label="Modifier la vidéo et ouvrir la timeline"
      >
        <Scissors size={19} />
        <span>Modifier la vidéo</span>
      </button>
    </div>
  );
}
