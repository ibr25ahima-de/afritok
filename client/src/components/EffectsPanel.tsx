import React, { useState } from "react";
import { X } from "lucide-react";
import { AR_EFFECTS, CATEGORIES, type AREffect } from "@/features/ar/ARRegistry";

interface EffectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEffect: AREffect | null;
  onSelectEffect: (effect: AREffect | null) => void;
  previewImages?: Record<string, string>;
  previewsLoading?: boolean;
}

export { AR_EFFECTS, CATEGORIES } from "@/features/ar/ARRegistry";
export type { AREffect } from "@/features/ar/ARRegistry";

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  isOpen,
  onClose,
  selectedEffect,
  onSelectEffect,
  previewImages = {},
  previewsLoading = false,
}) => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]?.id ?? "all");
  const selectedId = selectedEffect?.id ?? "beauty-none";

  if (!isOpen) return null;

  const effects = AR_EFFECTS.filter((e) => activeCategory === "all" || e.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2">
        <h3 className="text-white text-[15px] font-bold">Choisis un effet</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-white/85" aria-label="Fermer">
          <X size={18} />
        </button>
      </div>
      <div className="flex gap-5 px-4 pb-3 border-b border-white/10 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`shrink-0 pb-2 text-[13.5px] font-semibold border-b-2 -mb-[1px] ${activeCategory === category.id ? "text-white border-white" : "text-white/50 border-transparent"}`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2.5 p-4 pb-[max(env(safe-area-inset-bottom),18px)]">
        {effects.map((effect) => {
          const selected = selectedId === effect.id;
          return (
            <button
              key={effect.id}
              type="button"
              onClick={() => onSelectEffect(effect.id === "beauty-none" ? null : effect)}
              className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 bg-white/5 ${selected ? "border-white" : "border-transparent"}`}
              aria-label={`${effect.name}: ${effect.description}`}
            >
              <img
                src={previewImages[effect.id] || effect.thumbnail}
                alt={effect.name}
                className={`w-full h-full object-cover transition-opacity ${previewsLoading && !previewImages[effect.id] ? "opacity-60" : "opacity-100"}`}
                draggable={false}
              />
              <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-t from-black/75 to-transparent">
                {selected ? "✓ " : ""}{effect.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EffectsPanel;
