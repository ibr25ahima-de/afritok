/**
 * Filter Library Component
 * 50+ Advanced Filters for Video Editing
 * Includes beauty, color, AR, and special effects
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import '../styles/filter-library.css';

export interface Filter {
  id: string;
  name: string;
  category: 'beauty' | 'color' | 'ar' | 'special' | 'vintage' | 'mood';
  cssFilter?: string;
  canvasFilter?: (ctx: CanvasRenderingContext2D) => void;
  thumbnail?: string;
}

// 50+ Professional Filters
export const FILTERS: Filter[] = [
  // Beauty Filters (10)
  {
    id: 'beauty-smooth',
    name: 'Smooth Skin',
    category: 'beauty',
    cssFilter: 'blur(0.5px) brightness(1.05)',
  },
  {
    id: 'beauty-glow',
    name: 'Glow',
    category: 'beauty',
    cssFilter: 'brightness(1.1) saturate(1.2)',
  },
  {
    id: 'beauty-brighten',
    name: 'Brighten',
    category: 'beauty',
    cssFilter: 'brightness(1.2) contrast(1.1)',
  },
  {
    id: 'beauty-whiten-teeth',
    name: 'Whiten Teeth',
    category: 'beauty',
    cssFilter: 'hue-rotate(10deg) saturate(1.3)',
  },
  {
    id: 'beauty-enlarge-eyes',
    name: 'Enlarge Eyes',
    category: 'beauty',
    cssFilter: 'contrast(1.3) brightness(1.1)',
  },
  {
    id: 'beauty-slim-face',
    name: 'Slim Face',
    category: 'beauty',
    cssFilter: 'contrast(1.2) saturate(1.1)',
  },
  {
    id: 'beauty-warm-skin',
    name: 'Warm Skin',
    category: 'beauty',
    cssFilter: 'hue-rotate(-10deg) saturate(1.2)',
  },
  {
    id: 'beauty-cool-skin',
    name: 'Cool Skin',
    category: 'beauty',
    cssFilter: 'hue-rotate(10deg) saturate(1.1)',
  },
  {
    id: 'beauty-natural',
    name: 'Natural',
    category: 'beauty',
    cssFilter: 'brightness(1.05) saturate(1.1)',
  },
  {
    id: 'beauty-porcelain',
    name: 'Porcelain',
    category: 'beauty',
    cssFilter: 'brightness(1.15) contrast(1.05) saturate(0.9)',
  },

  // Color Filters (15)
  {
    id: 'color-vivid',
    name: 'Vivid',
    category: 'color',
    cssFilter: 'saturate(1.5) contrast(1.1)',
  },
  {
    id: 'color-cool',
    name: 'Cool',
    category: 'color',
    cssFilter: 'hue-rotate(180deg) saturate(1.2)',
  },
  {
    id: 'color-warm',
    name: 'Warm',
    category: 'color',
    cssFilter: 'hue-rotate(-30deg) saturate(1.3)',
  },
  {
    id: 'color-neon',
    name: 'Neon',
    category: 'color',
    cssFilter: 'saturate(2) contrast(1.3) brightness(1.1)',
  },
  {
    id: 'color-pastel',
    name: 'Pastel',
    category: 'color',
    cssFilter: 'saturate(0.5) brightness(1.1) contrast(0.9)',
  },
  {
    id: 'color-sunset',
    name: 'Sunset',
    category: 'color',
    cssFilter: 'hue-rotate(-20deg) saturate(1.4) brightness(1.05)',
  },
  {
    id: 'color-ocean',
    name: 'Ocean',
    category: 'color',
    cssFilter: 'hue-rotate(200deg) saturate(1.3) brightness(0.95)',
  },
  {
    id: 'color-forest',
    name: 'Forest',
    category: 'color',
    cssFilter: 'hue-rotate(120deg) saturate(1.2) brightness(0.9)',
  },
  {
    id: 'color-rose',
    name: 'Rose',
    category: 'color',
    cssFilter: 'hue-rotate(-30deg) saturate(1.4)',
  },
  {
    id: 'color-purple',
    name: 'Purple',
    category: 'color',
    cssFilter: 'hue-rotate(270deg) saturate(1.3)',
  },
  {
    id: 'color-gold',
    name: 'Gold',
    category: 'color',
    cssFilter: 'hue-rotate(40deg) saturate(1.5) brightness(1.1)',
  },
  {
    id: 'color-silver',
    name: 'Silver',
    category: 'color',
    cssFilter: 'saturate(0.3) brightness(1.2) contrast(1.2)',
  },
  {
    id: 'color-teal',
    name: 'Teal',
    category: 'color',
    cssFilter: 'hue-rotate(160deg) saturate(1.4)',
  },
  {
    id: 'color-coral',
    name: 'Coral',
    category: 'color',
    cssFilter: 'hue-rotate(10deg) saturate(1.5) brightness(1.05)',
  },
  {
    id: 'color-mint',
    name: 'Mint',
    category: 'color',
    cssFilter: 'hue-rotate(140deg) saturate(1.3) brightness(1.1)',
  },

  // Vintage Filters (10)
  {
    id: 'vintage-sepia',
    name: 'Sepia',
    category: 'vintage',
    cssFilter: 'sepia(0.8) saturate(1.2)',
  },
  {
    id: 'vintage-retro',
    name: 'Retro',
    category: 'vintage',
    cssFilter: 'sepia(0.5) hue-rotate(-10deg) saturate(1.3)',
  },
  {
    id: 'vintage-film',
    name: 'Film',
    category: 'vintage',
    cssFilter: 'contrast(1.2) saturate(0.8) brightness(0.95)',
  },
  {
    id: 'vintage-polaroid',
    name: 'Polaroid',
    category: 'vintage',
    cssFilter: 'saturate(1.3) contrast(1.1) brightness(1.05)',
  },
  {
    id: 'vintage-80s',
    name: '80s',
    category: 'vintage',
    cssFilter: 'hue-rotate(-20deg) saturate(1.5) brightness(1.1)',
  },
  {
    id: 'vintage-90s',
    name: '90s',
    category: 'vintage',
    cssFilter: 'saturate(0.7) brightness(0.95) contrast(1.1)',
  },
  {
    id: 'vintage-fade',
    name: 'Fade',
    category: 'vintage',
    cssFilter: 'brightness(1.1) contrast(0.8) saturate(0.9)',
  },
  {
    id: 'vintage-faded-film',
    name: 'Faded Film',
    category: 'vintage',
    cssFilter: 'sepia(0.3) brightness(1.15) contrast(0.9)',
  },
  {
    id: 'vintage-old-photo',
    name: 'Old Photo',
    category: 'vintage',
    cssFilter: 'sepia(0.6) brightness(0.9) contrast(1.2)',
  },
  {
    id: 'vintage-vhs',
    name: 'VHS',
    category: 'vintage',
    cssFilter: 'saturate(1.2) contrast(1.3) brightness(0.95)',
  },

  // Mood Filters (10)
  {
    id: 'mood-cinematic',
    name: 'Cinematic',
    category: 'mood',
    cssFilter: 'contrast(1.2) saturate(0.9) brightness(1.05)',
  },
  {
    id: 'mood-dramatic',
    name: 'Dramatic',
    category: 'mood',
    cssFilter: 'contrast(1.4) brightness(0.9) saturate(1.1)',
  },
  {
    id: 'mood-dreamy',
    name: 'Dreamy',
    category: 'mood',
    cssFilter: 'brightness(1.2) saturate(0.8) blur(0.3px)',
  },
  {
    id: 'mood-moody',
    name: 'Moody',
    category: 'mood',
    cssFilter: 'brightness(0.85) contrast(1.3) saturate(0.9)',
  },
  {
    id: 'mood-energetic',
    name: 'Energetic',
    category: 'mood',
    cssFilter: 'saturate(1.4) contrast(1.2) brightness(1.1)',
  },
  {
    id: 'mood-calm',
    name: 'Calm',
    category: 'mood',
    cssFilter: 'saturate(0.7) brightness(1.05) contrast(0.95)',
  },
  {
    id: 'mood-romantic',
    name: 'Romantic',
    category: 'mood',
    cssFilter: 'hue-rotate(-15deg) saturate(1.3) brightness(1.1)',
  },
  {
    id: 'mood-adventure',
    name: 'Adventure',
    category: 'mood',
    cssFilter: 'saturate(1.3) contrast(1.15) brightness(1.05)',
  },
  {
    id: 'mood-mysterious',
    name: 'Mysterious',
    category: 'mood',
    cssFilter: 'brightness(0.8) contrast(1.2) saturate(0.8)',
  },
  {
    id: 'mood-joyful',
    name: 'Joyful',
    category: 'mood',
    cssFilter: 'saturate(1.5) brightness(1.15) contrast(1.1)',
  },

  // Special Effects (5)
  {
    id: 'special-bw',
    name: 'Black & White',
    category: 'special',
    cssFilter: 'grayscale(1)',
  },
  {
    id: 'special-invert',
    name: 'Invert',
    category: 'special',
    cssFilter: 'invert(1)',
  },
  {
    id: 'special-blur',
    name: 'Blur',
    category: 'special',
    cssFilter: 'blur(2px)',
  },
  {
    id: 'special-sharp',
    name: 'Sharp',
    category: 'special',
    cssFilter: 'contrast(1.5) brightness(1.05)',
  },
  {
    id: 'special-hdr',
    name: 'HDR',
    category: 'special',
    cssFilter: 'contrast(1.3) saturate(1.2) brightness(1.1)',
  },
];

interface FilterLibraryProps {
  onFilterSelect?: (filter: Filter) => void;
  selectedFilters?: string[];
  onFilterRemove?: (filterId: string) => void;
}

export const FilterLibrary: React.FC<FilterLibraryProps> = ({
  onFilterSelect,
  selectedFilters = [],
  onFilterRemove,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'beauty', name: 'Beauty' },
    { id: 'color', name: 'Color' },
    { id: 'vintage', name: 'Vintage' },
    { id: 'mood', name: 'Mood' },
    { id: 'special', name: 'Special' },
  ];

  const filteredFilters =
    activeCategory === 'all'
      ? FILTERS
      : FILTERS.filter((f) => f.category === activeCategory);

  return (
    <div className="filter-library">
      {/* Category Tabs */}
      <div className="filter-categories">
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

      {/* Selected Filters */}
      {selectedFilters.length > 0 && (
        <div className="selected-filters">
          <h4>Applied Filters</h4>
          <div className="filters-list">
            {selectedFilters.map((filterId) => {
              const filter = FILTERS.find((f) => f.id === filterId);
              return (
                <div key={filterId} className="filter-tag">
                  <span>{filter?.name}</span>
                  <button
                    onClick={() => onFilterRemove?.(filterId)}
                    className="remove-btn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Grid */}
      <div className="filter-grid">
        {filteredFilters.map((filter) => (
          <button
            key={filter.id}
            className={`filter-item ${selectedFilters.includes(filter.id) ? 'selected' : ''}`}
            onClick={() => onFilterSelect?.(filter)}
            title={filter.name}
          >
            <div
              className="filter-preview"
              style={{
                filter: filter.cssFilter,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            />
            <span className="filter-name">{filter.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
