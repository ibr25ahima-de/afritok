/**
 * EffectsPanel Component
 * Carousel horizontal d'effets AR TikTok-style
 * Layout identique à TikTok :
 * - Catégories scrollables en haut (Tous, Beauté, Visuel, Animé, Animaux, Masques, Fun)
 * - Carousel d'effets avec vignettes rondes de visages
 * - Nom de l'effet sélectionné affiché en bas
 * - Défilement horizontal fluide
 */

import React, { useState, useRef } from 'react';

export interface AREffect {
  id: string;
  name: string;
  category: 'beauty' | 'visual' | 'animated' | 'animal' | 'mask' | 'fun';
  // Vignette : URL d'image de visage ou gradient
  thumbnail: string;
  description: string;
  // Configuration de l'effet
  beautyConfig?: {
    smoothSkin?: number;
    enlargeEyes?: number;
    slimFace?: number;
    brightenSkin?: number;
    whitenTeeth?: number;
    enlargeLips?: number;
    symmetry?: number;
  };
  visualConfig?: {
    filter?: string;
    overlay?: string;
    intensity?: number;
  };
}

export const AR_EFFECTS: AREffect[] = [
  // ============ BEAUTÉ ============
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

  // ============ VISUELS ============
  {
    id: 'visual-cold',
    name: 'Froid',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=120&h=120&fit=crop&crop=face',
    description: 'Ton bleu froid',
    visualConfig: { filter: 'hue-rotate(180deg) saturate(1.2) brightness(1.05)', intensity: 0.7 },
  },
  {
    id: 'visual-warm',
    name: 'Chaud',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face',
    description: 'Ton doré chaud',
    visualConfig: { filter: 'hue-rotate(-20deg) saturate(1.4) brightness(1.1)', intensity: 0.7 },
  },
  {
    id: 'visual-neon',
    name: 'Néon',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
    description: 'Couleurs néon saturées',
    visualConfig: { filter: 'saturate(2) contrast(1.3) brightness(1.1)', intensity: 0.8 },
  },
  {
    id: 'visual-vintage',
    name: 'Vintage',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop&crop=face',
    description: 'Effet rétro vintage',
    visualConfig: { filter: 'sepia(0.6) saturate(1.2) brightness(0.95)', intensity: 0.7 },
  },
  {
    id: 'visual-dreamy',
    name: 'Rêve',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=face',
    description: 'Effet onirique doux',
    visualConfig: { filter: 'brightness(1.15) saturate(0.8) blur(0.5px)', intensity: 0.6 },
  },
  {
    id: 'visual-moody',
    name: 'Moody',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=120&h=120&fit=crop&crop=face',
    description: 'Ambiance sombre dramatique',
    visualConfig: { filter: 'brightness(0.85) contrast(1.3) saturate(0.9)', intensity: 0.8 },
  },
  {
    id: 'visual-cinematic',
    name: 'Cinéma',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face',
    description: 'Look cinématographique',
    visualConfig: { filter: 'contrast(1.2) saturate(0.9) brightness(1.05)', intensity: 0.8 },
  },
  {
    id: 'visual-pastel',
    name: 'Pastel',
    category: 'visual',
    thumbnail: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=120&h=120&fit=crop&crop=face',
    description: 'Couleurs pastel douces',
    visualConfig: { filter: 'saturate(0.5) brightness(1.1) contrast(0.9)', intensity: 0.6 },
  },

  // ============ DESSINS ANIMÉS ============
  {
    id: 'animated-cartoon',
    name: 'Cartoon',
    category: 'animated',
    thumbnail: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face',
    description: 'Style dessin animé',
    visualConfig: { filter: 'saturate(1.5) contrast(1.3) brightness(1.1)', overlay: 'cartoon', intensity: 0.8 },
  },
  {
    id: 'animated-anime',
    name: 'Anime',
    category: 'animated',
    thumbnail: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&h=120&fit=crop&crop=face',
    description: 'Style anime japonais',
    visualConfig: { filter: 'saturate(1.2) contrast(1.1) brightness(1.15)', overlay: 'anime', intensity: 0.7 },
  },
  {
    id: 'animated-pop',
    name: 'Pop Art',
    category: 'animated',
    thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face',
    description: 'Style Pop Art coloré',
    visualConfig: { filter: 'saturate(1.8) contrast(1.4)', overlay: 'pop-art', intensity: 0.9 },
  },
  {
    id: 'animated-pixel',
    name: 'Pixel',
    category: 'animated',
    thumbnail: 'https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=120&h=120&fit=crop&crop=face',
    description: 'Style pixel art rétro',
    visualConfig: { filter: 'contrast(1.3) saturate(0.9)', overlay: 'pixel', intensity: 0.7 },
  },

  // ============ ANIMAUX ============
  {
    id: 'animal-cat',
    name: 'Chat',
    category: 'animal',
    thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face',
    description: 'Oreilles et nez de chat',
    visualConfig: { overlay: 'cat-ears', intensity: 1 },
  },
  {
    id: 'animal-dog',
    name: 'Chien',
    category: 'animal',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    description: 'Oreilles et nez de chien',
    visualConfig: { overlay: 'dog-ears', intensity: 1 },
  },
  {
    id: 'animal-rabbit',
    name: 'Lapin',
    category: 'animal',
    thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face',
    description: 'Oreilles de lapin',
    visualConfig: { overlay: 'rabbit-ears', intensity: 1 },
  },
  {
    id: 'animal-bear',
    name: 'Ours',
    category: 'animal',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
    description: 'Oreilles d\'ours',
    visualConfig: { overlay: 'bear-ears', intensity: 1 },
  },

  // ============ MASQUES ============
  {
    id: 'mask-clown',
    name: 'Clown',
    category: 'mask',
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face',
    description: 'Maquillage de clown',
    visualConfig: { overlay: 'clown', intensity: 1 },
  },
  {
    id: 'mask-vampire',
    name: 'Vampire',
    category: 'mask',
    thumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face',
    description: 'Effet vampire avec crocs',
    visualConfig: { filter: 'contrast(1.2) brightness(0.8) saturate(0.8)', overlay: 'vampire', intensity: 0.8 },
  },
  {
    id: 'mask-alien',
    name: 'Alien',
    category: 'mask',
    thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face',
    description: 'Visage d\'alien vert',
    visualConfig: { filter: 'hue-rotate(80deg) saturate(1.5)', overlay: 'alien', intensity: 0.9 },
  },
  {
    id: 'mask-ghost',
    name: 'Fantôme',
    category: 'mask',
    thumbnail: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=120&h=120&fit=crop&crop=face',
    description: 'Effet fantôme blanchâtre',
    visualConfig: { filter: 'brightness(1.3) saturate(0.3) contrast(1.1)', overlay: 'ghost', intensity: 0.7 },
  },

  // ============ FUN ============
  {
    id: 'fun-glitch',
    name: 'Glitch',
    category: 'fun',
    thumbnail: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop&crop=face',
    description: 'Effet glitch numérique',
    visualConfig: { filter: 'saturate(1.5) contrast(1.2)', overlay: 'glitch', intensity: 0.8 },
  },
  {
    id: 'fun-trippy',
    name: 'Trippy',
    category: 'fun',
    thumbnail: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=120&h=120&fit=crop&crop=face',
    description: 'Effet psychédélique',
    visualConfig: { filter: 'hue-rotate(120deg) saturate(1.8) contrast(1.2)', overlay: 'trippy', intensity: 0.7 },
  },
  {
    id: 'fun-fire',
    name: 'Flamme',
    category: 'fun',
    thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=face',
    description: 'Flammes autour du visage',
    visualConfig: { overlay: 'fire', intensity: 1 },
  },
  {
    id: 'fun-crown',
    name: 'Couronne',
    category: 'fun',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    description: 'Couronne royale',
    visualConfig: { overlay: 'crown', intensity: 1 },
  },
  {
    id: 'fun-hearts',
    name: 'Coeurs',
    category: 'fun',
    thumbnail: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face',
    description: 'Coeurs flottants animés',
    visualConfig: { overlay: 'hearts', intensity: 1 },
  },
  {
    id: 'fun-sparkles',
    name: 'Étincelles',
    category: 'fun',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face',
    description: 'Étincelles brillantes',
    visualConfig: { overlay: 'sparkles', intensity: 1 },
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
  onSelectEffect: (effect: AREffect | null) => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  selectedEffect,
  onSelectEffect,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredEffects =
    activeCategory === 'all'
      ? AR_EFFECTS
      : AR_EFFECTS.filter((e) => e.category === activeCategory);

  return (
    <div className="bg-black/90 backdrop-blur-lg rounded-t-2xl">
      {/* Barre de catégorie scrollable - Style TikTok */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 pt-2 pb-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
            activeCategory === 'all'
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/70 hover:bg-white/15'
          }`}
        >
          ✨ Tous
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCategory === cat.id
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Carousel d'effets scrollable horizontalement - Style TikTok */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar px-3 py-2 scroll-smooth"
      >
        {/* Effet "Aucun" - Original */}
        <button
          onClick={() => onSelectEffect(null)}
          className={`flex flex-col items-center gap-1 min-w-[68px] transition-all ${
            selectedEffect === null ? 'scale-105' : 'opacity-70 hover:opacity-90'
          }`}
        >
          <div
            className={`w-[58px] h-[58px] rounded-full overflow-hidden border-2 flex items-center justify-center ${
              selectedEffect === null
                ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                : 'border-white/20'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            }}
          >
            <span className="text-[10px] text-gray-400 font-bold">Aucun</span>
          </div>
          <span className="text-[10px] font-medium text-white/70">Original</span>
        </button>

        {/* Effets filtrés */}
        {filteredEffects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => onSelectEffect(effect)}
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
              style={{
                backgroundImage: effect.thumbnail.startsWith('http')
                  ? `url(${effect.thumbnail})`
                  : effect.thumbnail,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <span className="text-[10px] font-medium text-white/70 max-w-[68px] truncate">
              {effect.name}
            </span>
          </button>
        ))}

        {/* Espace pour le scroll */}
        <div className="min-w-[12px]" />
      </div>

      {/* Nom de l'effet sélectionné - Style TikTok */}
      {selectedEffect && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-yellow-400 font-bold bg-yellow-400/10 px-2.5 py-1 rounded-full">
              {selectedEffect.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
