/**
 * EffectsPanel Component
 * Carousel horizontal d'effets AR TikTok-style
 * Beauté, visuels, dessins animés, animaux, masques
 * Défilement horizontal avec vignettes
 */

import React, { useState, useRef } from 'react';

export interface AREffect {
  id: string;
  name: string;
  category: 'beauty' | 'visual' | 'animated' | 'animal' | 'mask' | 'fun';
  thumbnail: string; // URL ou gradient pour la vignette
  description: string;
  // Configuration de l'effet
  beautyConfig?: {
    smoothSkin?: number;       // 0-1
    enlargeEyes?: number;      // 0-1
    slimFace?: number;         // 0-1
    brightenSkin?: number;     // 0-1
    whitenTeeth?: number;      // 0-1
    enlargeLips?: number;      // 0-1
    removeBlemishes?: boolean;
    symmetry?: number;         // 0-1
  };
  visualConfig?: {
    filter?: string;           // CSS filter
    overlay?: string;          // type d'overlay
    intensity?: number;        // 0-1
  };
}

export const AR_EFFECTS: AREffect[] = [
  // ============ BEAUTÉ ============
  {
    id: 'beauty-natural',
    name: 'Naturel',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    description: 'Peau lissée naturelle',
    beautyConfig: {
      smoothSkin: 0.3,
      brightenSkin: 0.2,
      removeBlemishes: true,
      symmetry: 0.2,
    },
  },
  {
    id: 'beauty-smooth',
    name: 'Peau lisse',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    description: 'Lissage intense de la peau',
    beautyConfig: {
      smoothSkin: 0.7,
      brightenSkin: 0.3,
      removeBlemishes: true,
      symmetry: 0.3,
    },
  },
  {
    id: 'beauty-porcelain',
    name: 'Porcelaine',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
    description: 'Teint de porcelaine parfait',
    beautyConfig: {
      smoothSkin: 0.8,
      brightenSkin: 0.5,
      whitenTeeth: 0.6,
      removeBlemishes: true,
      symmetry: 0.4,
    },
  },
  {
    id: 'beauty-glow',
    name: 'Glow',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face',
    description: 'Éclat lumineux',
    beautyConfig: {
      smoothSkin: 0.4,
      brightenSkin: 0.6,
      enlargeEyes: 0.2,
    },
  },
  {
    id: 'beauty-big-eyes',
    name: 'Grands yeux',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    description: 'Yeux agrandis',
    beautyConfig: {
      enlargeEyes: 0.7,
      smoothSkin: 0.3,
    },
  },
  {
    id: 'beauty-slim',
    name: 'Visage fin',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face',
    description: 'Affine le visage',
    beautyConfig: {
      slimFace: 0.6,
      smoothSkin: 0.3,
    },
  },
  {
    id: 'beauty-full-lips',
    name: 'Lèvres pulpeuses',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    description: 'Lèvres plus volumineuses',
    beautyConfig: {
      enlargeLips: 0.5,
      smoothSkin: 0.3,
    },
  },
  {
    id: 'beauty-symmetry',
    name: 'Symétrie',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    description: 'Visage parfaitement symétrique',
    beautyConfig: {
      symmetry: 0.8,
      smoothSkin: 0.3,
    },
  },

  // ============ VISUELS ============
  {
    id: 'visual-cold',
    name: 'Froid',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #00c6ff, #0072ff)',
    description: 'Ton bleu froid',
    visualConfig: {
      filter: 'hue-rotate(180deg) saturate(1.2) brightness(1.05)',
      intensity: 0.7,
    },
  },
  {
    id: 'visual-warm',
    name: 'Chaud',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #f2994a, #f2c94c)',
    description: 'Ton doré chaud',
    visualConfig: {
      filter: 'hue-rotate(-20deg) saturate(1.4) brightness(1.1)',
      intensity: 0.7,
    },
  },
  {
    id: 'visual-neon',
    name: 'Néon',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #f093fb, #f5576c)',
    description: 'Couleurs néon saturées',
    visualConfig: {
      filter: 'saturate(2) contrast(1.3) brightness(1.1)',
      intensity: 0.8,
    },
  },
  {
    id: 'visual-vintage',
    name: 'Vintage',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #c2956a, #8b6914)',
    description: 'Effet rétro vintage',
    visualConfig: {
      filter: 'sepia(0.6) saturate(1.2) brightness(0.95)',
      intensity: 0.7,
    },
  },
  {
    id: 'visual-dreamy',
    name: 'Rêve',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    description: 'Effet onirique doux',
    visualConfig: {
      filter: 'brightness(1.15) saturate(0.8) blur(0.5px)',
      intensity: 0.6,
    },
  },
  {
    id: 'visual-moody',
    name: 'Moody',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #2c3e50, #4ca1af)',
    description: 'Ambiance sombre dramatique',
    visualConfig: {
      filter: 'brightness(0.85) contrast(1.3) saturate(0.9)',
      intensity: 0.8,
    },
  },
  {
    id: 'visual-cinematic',
    name: 'Cinéma',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #0f0c29, #302b63)',
    description: 'Look cinématographique',
    visualConfig: {
      filter: 'contrast(1.2) saturate(0.9) brightness(1.05)',
      intensity: 0.8,
    },
  },
  {
    id: 'visual-pastel',
    name: 'Pastel',
    category: 'visual',
    thumbnail: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
    description: 'Couleurs pastel douces',
    visualConfig: {
      filter: 'saturate(0.5) brightness(1.1) contrast(0.9)',
      intensity: 0.6,
    },
  },

  // ============ DESSINS ANIMÉS ============
  {
    id: 'animated-cartoon',
    name: 'Cartoon',
    category: 'animated',
    thumbnail: 'linear-gradient(135deg, #ff6b6b, #ffd93d)',
    description: 'Style dessin animé',
    visualConfig: {
      filter: 'saturate(1.5) contrast(1.3) brightness(1.1)',
      overlay: 'cartoon',
      intensity: 0.8,
    },
  },
  {
    id: 'animated-anime',
    name: 'Anime',
    category: 'animated',
    thumbnail: 'linear-gradient(135deg, #667eea, #764ba2)',
    description: 'Style anime japonais',
    visualConfig: {
      filter: 'saturate(1.2) contrast(1.1) brightness(1.15)',
      overlay: 'anime',
      intensity: 0.7,
    },
  },
  {
    id: 'animated-pop',
    name: 'Pop Art',
    category: 'animated',
    thumbnail: 'linear-gradient(135deg, #ff0844, #ffb199)',
    description: 'Style Pop Art coloré',
    visualConfig: {
      filter: 'saturate(1.8) contrast(1.4)',
      overlay: 'pop-art',
      intensity: 0.9,
    },
  },
  {
    id: 'animated-pixel',
    name: 'Pixel',
    category: 'animated',
    thumbnail: 'linear-gradient(135deg, #0f2027, #203a43)',
    description: 'Style pixel art rétro',
    visualConfig: {
      filter: 'contrast(1.3) saturate(0.9)',
      overlay: 'pixel',
      intensity: 0.7,
    },
  },

  // ============ ANIMAUX ============
  {
    id: 'animal-cat',
    name: 'Chat',
    category: 'animal',
    thumbnail: 'linear-gradient(135deg, #f093fb, #f5576c)',
    description: 'Oreilles et nez de chat',
    visualConfig: {
      overlay: 'cat-ears',
      intensity: 1,
    },
  },
  {
    id: 'animal-dog',
    name: 'Chien',
    category: 'animal',
    thumbnail: 'linear-gradient(135deg, #d4a373, #e9c46a)',
    description: 'Oreilles et nez de chien',
    visualConfig: {
      overlay: 'dog-ears',
      intensity: 1,
    },
  },
  {
    id: 'animal-rabbit',
    name: 'Lapin',
    category: 'animal',
    thumbnail: 'linear-gradient(135deg, #ffb7b2, #ffdac1)',
    description: 'Oreilles de lapin',
    visualConfig: {
      overlay: 'rabbit-ears',
      intensity: 1,
    },
  },
  {
    id: 'animal-bear',
    name: 'Ours',
    category: 'animal',
    thumbnail: 'linear-gradient(135deg, #5c4033, #8b6914)',
    description: 'Oreilles d\'ours',
    visualConfig: {
      overlay: 'bear-ears',
      intensity: 1,
    },
  },

  // ============ MASQUES ============
  {
    id: 'mask-clown',
    name: 'Clown',
    category: 'mask',
    thumbnail: 'linear-gradient(135deg, #ff0000, #ffffff)',
    description: 'Maquillage de clown',
    visualConfig: {
      overlay: 'clown',
      intensity: 1,
    },
  },
  {
    id: 'mask-vampire',
    name: 'Vampire',
    category: 'mask',
    thumbnail: 'linear-gradient(135deg, #1a0000, #8b0000)',
    description: 'Effet vampire',
    visualConfig: {
      filter: 'contrast(1.2) brightness(0.8) saturate(0.8)',
      overlay: 'vampire',
      intensity: 0.8,
    },
  },
  {
    id: 'mask-alien',
    name: 'Alien',
    category: 'mask',
    thumbnail: 'linear-gradient(135deg, #00ff00, #006400)',
    description: 'Visage d\'alien',
    visualConfig: {
      filter: 'hue-rotate(80deg) saturate(1.5)',
      overlay: 'alien',
      intensity: 0.9,
    },
  },
  {
    id: 'mask-ghost',
    name: 'Fantôme',
    category: 'mask',
    thumbnail: 'linear-gradient(135deg, #e0e0e0, #f5f5f5)',
    description: 'Effet fantôme',
    visualConfig: {
      filter: 'brightness(1.3) saturate(0.3) contrast(1.1)',
      overlay: 'ghost',
      intensity: 0.7,
    },
  },

  // ============ FUN ============
  {
    id: 'fun-glitch',
    name: 'Glitch',
    category: 'fun',
    thumbnail: 'linear-gradient(135deg, #00ff00, #ff00ff)',
    description: 'Effet glitch numérique',
    visualConfig: {
      filter: 'saturate(1.5) contrast(1.2)',
      overlay: 'glitch',
      intensity: 0.8,
    },
  },
  {
    id: 'fun-trippy',
    name: 'Trippy',
    category: 'fun',
    thumbnail: 'linear-gradient(135deg, #ff0000, #00ff00, #0000ff)',
    description: 'Effet psychédélique',
    visualConfig: {
      filter: 'hue-rotate(120deg) saturate(1.8) contrast(1.2)',
      overlay: 'trippy',
      intensity: 0.7,
    },
  },
  {
    id: 'fun-fire',
    name: 'Flamme',
    category: 'fun',
    thumbnail: 'linear-gradient(135deg, #f12711, #f5af19)',
    description: 'Effet feu autour du visage',
    visualConfig: {
      overlay: 'fire',
      intensity: 1,
    },
  },
  {
    id: 'fun-crown',
    name: 'Couronne',
    category: 'fun',
    thumbnail: 'linear-gradient(135deg, #ffd700, #ffaa00)',
    description: 'Couronne royale',
    visualConfig: {
      overlay: 'crown',
      intensity: 1,
    },
  },
  {
    id: 'fun-hearts',
    name: 'Coeurs',
    category: 'fun',
    thumbnail: 'linear-gradient(135deg, #ff69b4, #ff1493)',
    description: 'Coeurs flottants',
    visualConfig: {
      overlay: 'hearts',
      intensity: 1,
    },
  },
  {
    id: 'fun-sparkles',
    name: 'Étincelles',
    category: 'fun',
    thumbnail: 'linear-gradient(135deg, #ffd700, #ffffff)',
    description: 'Étincelles brillantes',
    visualConfig: {
      overlay: 'sparkles',
      intensity: 1,
    },
  },
];

// Catégories avec icônes
export const CATEGORIES = [
  { id: 'beauty', name: 'Beauté', icon: '✨' },
  { id: 'visual', name: 'Visuel', icon: '🎨' },
  { id: 'animated', name: 'Animé', icon: '🎬' },
  { id: 'animal', name: 'Animaux', icon: '🐱' },
  { id: 'mask', name: 'Masques', icon: '🎭' },
  { id: 'fun', name: 'Fun', icon: '🎉' },
];

interface EffectsPanelProps {
  selectedEffect: AREffect | null;
  onSelectEffect: (effect: AREffect) => void;
  onClose?: () => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  selectedEffect,
  onSelectEffect,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredEffects =
    activeCategory === 'all'
      ? AR_EFFECTS
      : AR_EFFECTS.filter((e) => e.category === activeCategory);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-lg rounded-t-2xl">
      {/* Barre de catégorie scrollable */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar px-4 pt-3 pb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeCategory === 'all'
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/70'
          }`}
        >
          ✨ Tous
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Carousel d'effets scrollable horizontalement */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-3 scroll-smooth"
      >
        {/* Effet "Aucun" */}
        <button
          onClick={() => onSelectEffect(null as any)}
          className={`flex flex-col items-center gap-1.5 min-w-[72px] transition-all ${
            selectedEffect === null ? 'scale-105' : 'opacity-80'
          }`}
        >
          <div
            className={`w-[64px] h-[64px] rounded-full overflow-hidden border-2 flex items-center justify-center ${
              selectedEffect === null
                ? 'border-yellow-400'
                : 'border-white/20'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            }}
          >
            <span className="text-xs text-gray-400 font-bold">Aucun</span>
          </div>
          <span className="text-[10px] font-medium text-white/80">Original</span>
        </button>

        {/* Effets filtrés */}
        {filteredEffects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => onSelectEffect(effect)}
            className={`flex flex-col items-center gap-1.5 min-w-[72px] transition-all ${
              selectedEffect?.id === effect.id ? 'scale-105' : 'opacity-80 hover:opacity-100'
            }`}
          >
            <div
              className={`w-[64px] h-[64px] rounded-full overflow-hidden border-2 ${
                selectedEffect?.id === effect.id
                  ? 'border-yellow-400'
                  : 'border-white/20'
              }`}
              style={{
                // Si thumbnail est une URL
                backgroundImage: effect.thumbnail.startsWith('http')
                  ? `url(${effect.thumbnail})`
                  : effect.thumbnail,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <span className="text-[10px] font-medium text-white/80 max-w-[72px] truncate">
              {effect.name}
            </span>
          </button>
        ))}

        {/* Espace à droite pour le scroll */}
        <div className="min-w-[16px]" />
      </div>

      {/* Nom de l'effet sélectionné */}
      {selectedEffect && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 inline-flex">
            <span className="text-xs text-yellow-400 font-bold">
              {selectedEffect.name}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/80 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
