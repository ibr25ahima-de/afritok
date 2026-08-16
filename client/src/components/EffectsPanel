/**
 * EffectsPanel Component
 * Carousel horizontal d'effets Beauté TikTok-style
 * Layout identique à TikTok :
 * - Carousel d'effets avec vignettes rondes de visages
 * - Nom de l'effet sélectionné affiché en bas
 * - Défilement horizontal fluide
 */

import React, { useRef } from 'react';

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
  // ============ BEAUTÉ ============
  {
    id: 'beauty-none',
    name: 'Aucun',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    description: 'Original',
    beautyConfig: {},
  },
  {
    id: 'beauty-natural',
    name: 'Naturel',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face',
    description: 'Peau lissée subtilement',
    beautyConfig: { smoothSkin: 0.25, brightenSkin: 0.15, symmetry: 0.15 },
  },
  {
    id: 'beauty-smooth',
    name: 'Peau lisse',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face',
    description: 'Lissage intense de la peau',
    beautyConfig: { smoothSkin: 0.65, brightenSkin: 0.3, symmetry: 0.25 },
  },
  {
    id: 'beauty-porcelain',
    name: 'Porcelaine',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face',
    description: 'Teint de porcelaine parfait',
    beautyConfig: { smoothSkin: 0.75, brightenSkin: 0.45, whitenTeeth: 0.5, symmetry: 0.35 },
  },
  {
    id: 'beauty-glow',
    name: 'Glow',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face',
    description: 'Éclat lumineux',
    beautyConfig: { smoothSkin: 0.35, brightenSkin: 0.55, enlargeEyes: 0.15 },
  },
  {
    id: 'beauty-big-eyes',
    name: 'Grands yeux',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face',
    description: 'Yeux agrandis',
    beautyConfig: { enlargeEyes: 0.7, smoothSkin: 0.25 },
  },
  {
    id: 'beauty-slim',
    name: 'Visage fin',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&h=120&fit=crop&crop=face',
    description: 'Affine le visage',
    beautyConfig: { slimFace: 0.55, smoothSkin: 0.25 },
  },
  {
    id: 'beauty-full-lips',
    name: 'Lèvres pulpeuses',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    description: 'Lèvres plus volumineuses',
    beautyConfig: { enlargeLips: 0.5, smoothSkin: 0.25 },
  },
  {
    id: 'beauty-symmetry',
    name: 'Symétrie',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face',
    description: 'Visage parfaitement symétrique',
    beautyConfig: { symmetry: 0.75, smoothSkin: 0.3 },
  },
];

export const CATEGORIES = [
  { id: 'beauty', name: 'Beauté', icon: '✨' },
];

interface EffectsPanelProps {
  selectedEffect: AREffect | null;
  onSelectEffect: (effect: AREffect | null) => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  selectedEffect,
  onSelectEffect,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-black/90 backdrop-blur-lg rounded-t-2xl">
      {/* Barre de catégorie - Style TikTok */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 pt-2 pb-1.5">
        <button
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 bg-white text-black`}
        >
          ✨ Tous
        </button>
      </div>

      {/* Carousel d'effets scrollable horizontalement - Style TikTok */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar px-3 py-2 scroll-smooth"
      >
        {AR_EFFECTS.map((effect) => (
          <button
            key={effect.id}
            onClick={() => {
              if (effect.id === 'beauty-none') {
                onSelectEffect(null);
              } else {
                onSelectEffect(effect);
              }
            }}
            className={`flex flex-col items-center gap-1 min-w-[68px] transition-all ${
              selectedEffect?.id === effect.id
                ? 'scale-105'
                : 'opacity-70 hover:opacity-90'
            }`}
          >
            <div
              className={`w-[58px] h-[58px] rounded-full overflow-hidden border-2 ${
                selectedEffect?.id === effect.id
                  ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                  : 'border-white/20'
              }`}
            >
              <img
                src={effect.thumbnail}
                alt={effect.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <span className="text-[10px] text-white/80 font-medium truncate max-w-[68px]">
              {effect.name}
            </span>
          </button>
        ))}
      </div>

      {/* Nom de l'effet sélectionné */}
      {selectedEffect && (
        <div className="px-3 pb-2">
          <span className="text-[11px] text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded-full">
            {selectedEffect.name} ✕
          </span>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
