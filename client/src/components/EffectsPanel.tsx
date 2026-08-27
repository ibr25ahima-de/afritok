/**
 * EffectsPanel Component
 * Carousel horizontal d'effets Beauté TikTok-style.
 * Le bouton actuellement sélectionné reste au centre pendant le scroll.
 */
import React, { useEffect, useRef } from 'react';

export interface AREffect {
  id: string;
  name: string;
  category: 'beauty';
  thumbnail: string;
  description: string;
  beautyConfig?: {
    smoothSkin?: number;
    enlargeEyes?: number;
    slimFace?: number;
    brightenSkin?: number;
    whitenTeeth?: number;
    enlargeLips?: number;
    symmetry?: number;
  };
}

export const AR_EFFECTS: AREffect[] = [
  { id: 'beauty-none', name: 'Aucun', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face', description: 'Beauté naturelle', beautyConfig: {} },
  { id: 'beauty-natural', name: 'Naturel', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', description: 'Peau lissée naturellement', beautyConfig: { smoothSkin: 0.40, brightenSkin: 0.12, symmetry: 0.08 } },
  { id: 'beauty-smooth', name: 'Peau lisse', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', description: 'Lissage renforcé', beautyConfig: { smoothSkin: 0.90, brightenSkin: 0.18, symmetry: 0.12 } },
  { id: 'beauty-porcelain', name: 'Porcelaine', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face', description: 'Teint très lisse', beautyConfig: { smoothSkin: 1, brightenSkin: 0.30, whitenTeeth: 0.5, symmetry: 0.20 } },
  { id: 'beauty-glow', name: 'Glow', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face', description: 'Éclat lumineux', beautyConfig: { smoothSkin: 0.55, brightenSkin: 0.55, enlargeEyes: 0.15 } },
  { id: 'beauty-big-eyes', name: 'Grands yeux', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face', description: 'Yeux agrandis', beautyConfig: { enlargeEyes: 0.85, smoothSkin: 0.45 } },
  { id: 'beauty-slim', name: 'Visage fin', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&h=120&fit=crop&crop=face', description: 'Affine le visage', beautyConfig: { slimFace: 0.80, smoothSkin: 0.45 } },
  { id: 'beauty-full-lips', name: 'Lèvres pulpeuses', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face', description: 'Lèvres plus volumineuses', beautyConfig: { enlargeLips: 0.75, smoothSkin: 0.45 } },
  { id: 'beauty-symmetry', name: 'Symétrie', category: 'beauty', thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face', description: 'Symétrie douce', beautyConfig: { symmetry: 0.85, smoothSkin: 0.50 } },
];

export const CATEGORIES = [{ id: 'beauty', name: 'Beauté', icon: '✨' }];

interface EffectsPanelProps {
  selectedEffect: AREffect | null;
  onSelectEffect: (effect: AREffect | null) => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ selectedEffect, onSelectEffect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedId = selectedEffect?.id ?? 'beauty-none';

  useEffect(() => {
    const container = scrollRef.current;
    const selected = container?.querySelector<HTMLElement>(`[data-effect-id="${selectedId}"]`);
    if (!container || !selected) return;
    selected.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedId]);

  return (
    <div className="fixed left-0 right-0 bottom-[108px] z-[60] pointer-events-none">
      <div className="mx-auto max-w-[680px] w-full bg-black/45 backdrop-blur-md rounded-2xl py-1 pointer-events-auto">
        <div
          ref={scrollRef}
          className="flex items-end gap-3 overflow-x-auto no-scrollbar px-[calc(50vw-34px)] py-1 scroll-smooth snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {AR_EFFECTS.map((effect) => {
            const selected = selectedId === effect.id;
            return (
              <button
                key={effect.id}
                data-effect-id={effect.id}
                onClick={() => onSelectEffect(effect.id === 'beauty-none' ? null : effect)}
                className={`flex-shrink-0 w-[68px] snap-center flex flex-col items-center gap-1 transition-transform duration-150 ${selected ? 'scale-110' : 'opacity-75'}`}
                aria-label={effect.name}
              >
                <div className={`w-[60px] h-[60px] rounded-full overflow-hidden border-[3px] bg-black ${selected ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]' : 'border-white/25'}`}>
                  <img src={effect.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <span className={`text-[10px] leading-3 font-semibold truncate max-w-[68px] ${selected ? 'text-white' : 'text-white/75'}`}>
                  {effect.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EffectsPanel;
