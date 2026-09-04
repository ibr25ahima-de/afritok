import React, { useEffect, useRef } from "react";
import { AR_EFFECTS, CATEGORIES, type AREffect } from "@/features/ar/ARRegistry";

interface EffectsPanelProps {
  selectedEffect: AREffect | null;
  onSelectEffect: (effect: AREffect | null) => void;
}

export { AR_EFFECTS, CATEGORIES } from "@/features/ar/ARRegistry";
export type { AREffect } from "@/features/ar/ARRegistry";

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ selectedEffect, onSelectEffect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedId = selectedEffect?.id ?? "beauty-none";

  useEffect(() => {
    const container = scrollRef.current;
    const selected = container?.querySelector<HTMLElement>(`[data-effect-id="${selectedId}"]`);
    if (!container || !selected) return;
    requestAnimationFrame(() => selected.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }));
  }, [selectedId]);

  return (
    <div className="fixed left-0 right-0 bottom-[108px] z-[60] pointer-events-none">
      <div className="mx-auto max-w-[720px] w-full bg-black/55 backdrop-blur-md rounded-2xl py-2 pointer-events-auto border border-white/10">
        <div className="px-4 pb-1 flex items-center justify-center gap-3 text-[10px] font-bold text-white/60 uppercase tracking-wider">
          {CATEGORIES.map((category) => (
            <span key={category.id}>{category.icon} {category.name}</span>
          ))}
        </div>
        <div
          ref={scrollRef}
          className="flex items-end gap-3 overflow-x-auto no-scrollbar px-[calc(50vw-34px)] py-1 scroll-smooth snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
        >
          {AR_EFFECTS.map((effect) => {
            const selected = selectedId === effect.id;
            return (
              <button
                key={effect.id}
                type="button"
                data-effect-id={effect.id}
                onClick={() => onSelectEffect(effect.id === "beauty-none" ? null : effect)}
                className={`flex-shrink-0 w-[72px] snap-center flex flex-col items-center gap-1 transition-transform duration-150 ${selected ? "scale-110" : "opacity-80"}`}
                aria-label={`${effect.name}: ${effect.description}`}
                title={effect.description}
              >
                <div className={`w-[64px] h-[64px] rounded-full overflow-hidden border-[3px] bg-black ${selected ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" : "border-white/25"}`}>
                  <img src={effect.thumbnail} alt={effect.name} className="w-full h-full object-cover" draggable={false} />
                </div>
                <span className={`text-[10px] leading-3 font-semibold truncate max-w-[72px] ${selected ? "text-white" : "text-white/75"}`}>{effect.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EffectsPanel;
