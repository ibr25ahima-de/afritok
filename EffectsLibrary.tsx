/**
 * Effects Library Component
 * 100+ Professional Effects and Transitions
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import '../styles/effects-library.css';

export interface Effect {
  id: string;
  name: string;
  category: 'transition' | 'animation' | 'particle' | 'text' | 'overlay';
  duration: number; // in milliseconds
  cssAnimation?: string;
  description: string;
}

// 100+ Professional Effects
export const EFFECTS: Effect[] = [
  // Transitions (25)
  { id: 'trans-fade', name: 'Fade', category: 'transition', duration: 300, description: 'Simple fade transition' },
  { id: 'trans-slide-left', name: 'Slide Left', category: 'transition', duration: 400, description: 'Slide from right to left' },
  { id: 'trans-slide-right', name: 'Slide Right', category: 'transition', duration: 400, description: 'Slide from left to right' },
  { id: 'trans-slide-up', name: 'Slide Up', category: 'transition', duration: 400, description: 'Slide from bottom to top' },
  { id: 'trans-slide-down', name: 'Slide Down', category: 'transition', duration: 400, description: 'Slide from top to bottom' },
  { id: 'trans-zoom-in', name: 'Zoom In', category: 'transition', duration: 400, description: 'Zoom in transition' },
  { id: 'trans-zoom-out', name: 'Zoom Out', category: 'transition', duration: 400, description: 'Zoom out transition' },
  { id: 'trans-flip-h', name: 'Flip Horizontal', category: 'transition', duration: 500, description: 'Flip horizontally' },
  { id: 'trans-flip-v', name: 'Flip Vertical', category: 'transition', duration: 500, description: 'Flip vertically' },
  { id: 'trans-rotate', name: 'Rotate', category: 'transition', duration: 500, description: '360° rotation' },
  { id: 'trans-bounce', name: 'Bounce', category: 'transition', duration: 600, description: 'Bouncy transition' },
  { id: 'trans-elastic', name: 'Elastic', category: 'transition', duration: 600, description: 'Elastic effect' },
  { id: 'trans-blur', name: 'Blur', category: 'transition', duration: 400, description: 'Blur transition' },
  { id: 'trans-pixelate', name: 'Pixelate', category: 'transition', duration: 400, description: 'Pixelate effect' },
  { id: 'trans-wave', name: 'Wave', category: 'transition', duration: 500, description: 'Wave transition' },
  { id: 'trans-shatter', name: 'Shatter', category: 'transition', duration: 600, description: 'Glass shatter effect' },
  { id: 'trans-kaleidoscope', name: 'Kaleidoscope', category: 'transition', duration: 500, description: 'Kaleidoscope pattern' },
  { id: 'trans-swirl', name: 'Swirl', category: 'transition', duration: 500, description: 'Swirling motion' },
  { id: 'trans-ripple', name: 'Ripple', category: 'transition', duration: 600, description: 'Water ripple effect' },
  { id: 'trans-curtain', name: 'Curtain', category: 'transition', duration: 500, description: 'Curtain opening' },
  { id: 'trans-diagonal', name: 'Diagonal', category: 'transition', duration: 400, description: 'Diagonal wipe' },
  { id: 'trans-circle', name: 'Circle Wipe', category: 'transition', duration: 500, description: 'Circular wipe' },
  { id: 'trans-heart', name: 'Heart', category: 'transition', duration: 500, description: 'Heart shape wipe' },
  { id: 'trans-star', name: 'Star', category: 'transition', duration: 500, description: 'Star shape wipe' },
  { id: 'trans-glitch', name: 'Glitch', category: 'transition', duration: 400, description: 'Digital glitch effect' },

  // Animations (30)
  { id: 'anim-bounce', name: 'Bounce', category: 'animation', duration: 800, description: 'Bouncing animation' },
  { id: 'anim-shake', name: 'Shake', category: 'animation', duration: 400, description: 'Shaking motion' },
  { id: 'anim-pulse', name: 'Pulse', category: 'animation', duration: 1000, description: 'Pulsing effect' },
  { id: 'anim-swing', name: 'Swing', category: 'animation', duration: 1000, description: 'Swinging motion' },
  { id: 'anim-spin', name: 'Spin', category: 'animation', duration: 1000, description: 'Spinning rotation' },
  { id: 'anim-flip', name: 'Flip', category: 'animation', duration: 600, description: 'Flipping animation' },
  { id: 'anim-wobble', name: 'Wobble', category: 'animation', duration: 800, description: 'Wobbling motion' },
  { id: 'anim-jello', name: 'Jello', category: 'animation', duration: 900, description: 'Jello-like wobble' },
  { id: 'anim-heartbeat', name: 'Heartbeat', category: 'animation', duration: 1300, description: 'Heartbeat pulse' },
  { id: 'anim-float', name: 'Float', category: 'animation', duration: 2000, description: 'Floating motion' },
  { id: 'anim-glow', name: 'Glow', category: 'animation', duration: 1500, description: 'Glowing effect' },
  { id: 'anim-rainbow', name: 'Rainbow', category: 'animation', duration: 2000, description: 'Rainbow color shift' },
  { id: 'anim-morph', name: 'Morph', category: 'animation', duration: 1000, description: 'Shape morphing' },
  { id: 'anim-stretch', name: 'Stretch', category: 'animation', duration: 600, description: 'Stretching effect' },
  { id: 'anim-squeeze', name: 'Squeeze', category: 'animation', duration: 600, description: 'Squeezing effect' },
  { id: 'anim-skew', name: 'Skew', category: 'animation', duration: 500, description: 'Skewing motion' },
  { id: 'anim-tilt', name: 'Tilt', category: 'animation', duration: 400, description: 'Tilting motion' },
  { id: 'anim-sway', name: 'Sway', category: 'animation', duration: 1000, description: 'Swaying motion' },
  { id: 'anim-dance', name: 'Dance', category: 'animation', duration: 1200, description: 'Dancing movement' },
  { id: 'anim-wiggle', name: 'Wiggle', category: 'animation', duration: 600, description: 'Wiggling motion' },
  { id: 'anim-jump', name: 'Jump', category: 'animation', duration: 600, description: 'Jumping animation' },
  { id: 'anim-fall', name: 'Fall', category: 'animation', duration: 1000, description: 'Falling motion' },
  { id: 'anim-rise', name: 'Rise', category: 'animation', duration: 1000, description: 'Rising motion' },
  { id: 'anim-zoom', name: 'Zoom', category: 'animation', duration: 800, description: 'Zooming effect' },
  { id: 'anim-blur-in', name: 'Blur In', category: 'animation', duration: 600, description: 'Blur in effect' },
  { id: 'anim-blur-out', name: 'Blur Out', category: 'animation', duration: 600, description: 'Blur out effect' },
  { id: 'anim-fade-in', name: 'Fade In', category: 'animation', duration: 500, description: 'Fade in animation' },
  { id: 'anim-fade-out', name: 'Fade Out', category: 'animation', duration: 500, description: 'Fade out animation' },
  { id: 'anim-slide-in', name: 'Slide In', category: 'animation', duration: 600, description: 'Sliding in' },
  { id: 'anim-slide-out', name: 'Slide Out', category: 'animation', duration: 600, description: 'Sliding out' },

  // Particle Effects (20)
  { id: 'part-confetti', name: 'Confetti', category: 'particle', duration: 2000, description: 'Falling confetti' },
  { id: 'part-snow', name: 'Snow', category: 'particle', duration: 3000, description: 'Falling snow' },
  { id: 'part-rain', name: 'Rain', category: 'particle', duration: 2500, description: 'Falling rain' },
  { id: 'part-sparkles', name: 'Sparkles', category: 'particle', duration: 1500, description: 'Sparkling particles' },
  { id: 'part-stars', name: 'Stars', category: 'particle', duration: 2000, description: 'Twinkling stars' },
  { id: 'part-hearts', name: 'Hearts', category: 'particle', duration: 2000, description: 'Floating hearts' },
  { id: 'part-bubbles', name: 'Bubbles', category: 'particle', duration: 2500, description: 'Rising bubbles' },
  { id: 'part-leaves', name: 'Leaves', category: 'particle', duration: 3000, description: 'Falling leaves' },
  { id: 'part-petals', name: 'Petals', category: 'particle', duration: 2500, description: 'Falling petals' },
  { id: 'part-smoke', name: 'Smoke', category: 'particle', duration: 2000, description: 'Smoke effect' },
  { id: 'part-fire', name: 'Fire', category: 'particle', duration: 2000, description: 'Fire particles' },
  { id: 'part-water', name: 'Water', category: 'particle', duration: 2000, description: 'Water splash' },
  { id: 'part-dust', name: 'Dust', category: 'particle', duration: 1500, description: 'Dust particles' },
  { id: 'part-glitter', name: 'Glitter', category: 'particle', duration: 2000, description: 'Glittering effect' },
  { id: 'part-coins', name: 'Coins', category: 'particle', duration: 2000, description: 'Falling coins' },
  { id: 'part-diamonds', name: 'Diamonds', category: 'particle', duration: 2000, description: 'Falling diamonds' },
  { id: 'part-flowers', name: 'Flowers', category: 'particle', duration: 2500, description: 'Falling flowers' },
  { id: 'part-butterflies', name: 'Butterflies', category: 'particle', duration: 3000, description: 'Flying butterflies' },
  { id: 'part-birds', name: 'Birds', category: 'particle', duration: 3000, description: 'Flying birds' },
  { id: 'part-lightning', name: 'Lightning', category: 'particle', duration: 1000, description: 'Lightning bolts' },

  // Text Effects (15)
  { id: 'text-pop', name: 'Pop In', category: 'text', duration: 400, description: 'Text pops in' },
  { id: 'text-slide', name: 'Slide', category: 'text', duration: 500, description: 'Text slides in' },
  { id: 'text-fade', name: 'Fade', category: 'text', duration: 400, description: 'Text fades in' },
  { id: 'text-typewriter', name: 'Typewriter', category: 'text', duration: 1500, description: 'Typewriter effect' },
  { id: 'text-wave', name: 'Wave', category: 'text', duration: 1000, description: 'Wavy text' },
  { id: 'text-bounce', name: 'Bounce', category: 'text', duration: 800, description: 'Bouncing text' },
  { id: 'text-shake', name: 'Shake', category: 'text', duration: 400, description: 'Shaking text' },
  { id: 'text-flip', name: 'Flip', category: 'text', duration: 600, description: 'Flipping text' },
  { id: 'text-rotate', name: 'Rotate', category: 'text', duration: 800, description: 'Rotating text' },
  { id: 'text-glow', name: 'Glow', category: 'text', duration: 1000, description: 'Glowing text' },
  { id: 'text-shadow', name: 'Shadow', category: 'text', duration: 500, description: 'Shadow effect' },
  { id: 'text-outline', name: 'Outline', category: 'text', duration: 600, description: 'Outline animation' },
  { id: 'text-gradient', name: 'Gradient', category: 'text', duration: 1000, description: 'Gradient color shift' },
  { id: 'text-blur', name: 'Blur', category: 'text', duration: 500, description: 'Blur effect' },
  { id: 'text-distort', name: 'Distort', category: 'text', duration: 600, description: 'Distortion effect' },

  // Overlays (10)
  { id: 'over-vignette', name: 'Vignette', category: 'overlay', duration: 0, description: 'Dark vignette edges' },
  { id: 'over-grain', name: 'Film Grain', category: 'overlay', duration: 0, description: 'Film grain texture' },
  { id: 'over-lens-flare', name: 'Lens Flare', category: 'overlay', duration: 1000, description: 'Lens flare effect' },
  { id: 'over-chromatic', name: 'Chromatic Aberration', category: 'overlay', duration: 500, description: 'Color shift' },
  { id: 'over-scanlines', name: 'Scanlines', category: 'overlay', duration: 0, description: 'TV scanlines' },
  { id: 'over-noise', name: 'Noise', category: 'overlay', duration: 0, description: 'Static noise' },
  { id: 'over-bloom', name: 'Bloom', category: 'overlay', duration: 0, description: 'Bloom glow' },
  { id: 'over-light-leak', name: 'Light Leak', category: 'overlay', duration: 1500, description: 'Light leak effect' },
  { id: 'over-bokeh', name: 'Bokeh', category: 'overlay', duration: 0, description: 'Bokeh blur' },
  { id: 'over-halo', name: 'Halo', category: 'overlay', duration: 1000, description: 'Halo glow' },
];

interface EffectsLibraryProps {
  onEffectSelect?: (effect: Effect) => void;
  selectedEffects?: string[];
  onEffectRemove?: (effectId: string) => void;
}

export const EffectsLibrary: React.FC<EffectsLibraryProps> = ({
  onEffectSelect,
  selectedEffects = [],
  onEffectRemove,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'transition', name: 'Transitions' },
    { id: 'animation', name: 'Animations' },
    { id: 'particle', name: 'Particles' },
    { id: 'text', name: 'Text' },
    { id: 'overlay', name: 'Overlays' },
  ];

  const filteredEffects =
    activeCategory === 'all'
      ? EFFECTS
      : EFFECTS.filter((e) => e.category === activeCategory);

  return (
    <div className="effects-library">
      {/* Category Tabs */}
      <div className="effects-categories">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Effects Grid */}
      <div className="effects-grid">
        {filteredEffects.map((effect) => (
          <button
            key={effect.id}
            className={`effect-item ${selectedEffects.includes(effect.id) ? 'selected' : ''}`}
            onClick={() => onEffectSelect?.(effect)}
            title={effect.description}
          >
            <div className="effect-icon">✨</div>
            <span className="effect-name">{effect.name}</span>
            <span className="effect-duration">{effect.duration}ms</span>
          </button>
        ))}
      </div>
    </div>
  );
};
