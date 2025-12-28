/**
 * Composant ARFilters pour les filtres et effets AR
 * 
 * Fonctionnalités :
 * - Filtres visuels
 * - Effets AR (face detection, stickers)
 * - Transitions
 * - Ajustements de couleur
 */

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, RotateCcw } from 'lucide-react';

/**
 * Interface pour un filtre
 */
interface Filter {
  id: string;
  name: string;
  type: 'color' | 'blur' | 'brightness' | 'contrast' | 'saturate' | 'hueRotate' | 'sepia' | 'invert';
  value: number;
  min: number;
  max: number;
  unit: string;
}

/**
 * Interface pour un effet AR
 */
interface AREffect {
  id: string;
  name: string;
  type: 'faceDetection' | 'sticker' | 'morphing' | 'particleEffect';
  enabled: boolean;
}

/**
 * Props du composant
 */
interface ARFiltersProps {
  videoRef?: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  onFilterChange?: (filters: Filter[]) => void;
  onEffectChange?: (effects: AREffect[]) => void;
}

/**
 * Filtres prédéfinis
 */
const PREDEFINED_FILTERS: Record<string, Filter> = {
  brightness: {
    id: 'brightness',
    name: 'Luminosité',
    type: 'brightness',
    value: 100,
    min: 0,
    max: 200,
    unit: '%',
  },
  contrast: {
    id: 'contrast',
    name: 'Contraste',
    type: 'contrast',
    value: 100,
    min: 0,
    max: 200,
    unit: '%',
  },
  saturate: {
    id: 'saturate',
    name: 'Saturation',
    type: 'saturate',
    value: 100,
    min: 0,
    max: 200,
    unit: '%',
  },
  hueRotate: {
    id: 'hueRotate',
    name: 'Teinte',
    type: 'hueRotate',
    value: 0,
    min: 0,
    max: 360,
    unit: '°',
  },
  blur: {
    id: 'blur',
    name: 'Flou',
    type: 'blur',
    value: 0,
    min: 0,
    max: 20,
    unit: 'px',
  },
  sepia: {
    id: 'sepia',
    name: 'Sépia',
    type: 'sepia',
    value: 0,
    min: 0,
    max: 100,
    unit: '%',
  },
  invert: {
    id: 'invert',
    name: 'Inverser',
    type: 'invert',
    value: 0,
    min: 0,
    max: 100,
    unit: '%',
  },
};

/**
 * Thèmes de filtres prédéfinis
 */
const FILTER_THEMES: Record<string, Filter[]> = {
  vintage: [
    { ...PREDEFINED_FILTERS.sepia, value: 50 },
    { ...PREDEFINED_FILTERS.contrast, value: 80 },
    { ...PREDEFINED_FILTERS.saturate, value: 70 },
  ],
  noir: [
    { ...PREDEFINED_FILTERS.saturate, value: 0 },
    { ...PREDEFINED_FILTERS.contrast, value: 150 },
    { ...PREDEFINED_FILTERS.brightness, value: 90 },
  ],
  vivid: [
    { ...PREDEFINED_FILTERS.saturate, value: 150 },
    { ...PREDEFINED_FILTERS.contrast, value: 120 },
    { ...PREDEFINED_FILTERS.brightness, value: 110 },
  ],
  cool: [
    { ...PREDEFINED_FILTERS.hueRotate, value: 200 },
    { ...PREDEFINED_FILTERS.saturate, value: 120 },
    { ...PREDEFINED_FILTERS.brightness, value: 95 },
  ],
};

/**
 * Composant ARFilters
 */
export const ARFilters: React.FC<ARFiltersProps> = ({
  videoRef,
  canvasRef,
  onFilterChange,
  onEffectChange,
}) => {
  // États
  const [filters, setFilters] = useState<Filter[]>([PREDEFINED_FILTERS.brightness]);
  const [effects, setEffects] = useState<AREffect[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Appliquer les filtres au canvas
   */
  const applyFilters = (filterList: Filter[]) => {
    if (!canvasRef?.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Construire la chaîne de filtres CSS
    let filterString = '';

    for (const filter of filterList) {
      switch (filter.type) {
        case 'brightness':
          filterString += `brightness(${filter.value}%) `;
          break;
        case 'contrast':
          filterString += `contrast(${filter.value}%) `;
          break;
        case 'saturate':
          filterString += `saturate(${filter.value}%) `;
          break;
        case 'hueRotate':
          filterString += `hue-rotate(${filter.value}deg) `;
          break;
        case 'blur':
          filterString += `blur(${filter.value}px) `;
          break;
        case 'sepia':
          filterString += `sepia(${filter.value}%) `;
          break;
        case 'invert':
          filterString += `invert(${filter.value}%) `;
          break;
      }
    }

    if (canvasRef.current.style) {
      canvasRef.current.style.filter = filterString;
    }
  };

  /**
   * Mettre à jour un filtre
   */
  const updateFilter = (filterId: string, value: number) => {
    const updatedFilters = filters.map((f) =>
      f.id === filterId ? { ...f, value } : f
    );
    setFilters(updatedFilters);
    applyFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  /**
   * Appliquer un thème
   */
  const applyTheme = (themeName: string) => {
    const themeFilters = FILTER_THEMES[themeName];
    if (themeFilters) {
      setFilters(themeFilters);
      applyFilters(themeFilters);
      setSelectedTheme(themeName);
      onFilterChange?.(themeFilters);
    }
  };

  /**
   * Réinitialiser les filtres
   */
  const resetFilters = () => {
    const defaultFilters = [PREDEFINED_FILTERS.brightness];
    setFilters(defaultFilters);
    applyFilters(defaultFilters);
    setSelectedTheme(null);
    onFilterChange?.(defaultFilters);
  };

  /**
   * Basculer un effet AR
   */
  const toggleEffect = (effectId: string) => {
    const updatedEffects = effects.map((e) =>
      e.id === effectId ? { ...e, enabled: !e.enabled } : e
    );
    setEffects(updatedEffects);
    onEffectChange?.(updatedEffects);
  };

  // Appliquer les filtres au montage
  useEffect(() => {
    applyFilters(filters);
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        {/* Titre */}
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          Filtres et Effets
        </h2>

        {/* Thèmes */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Thèmes prédéfinis</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(FILTER_THEMES).map((themeName) => (
              <Button
                key={themeName}
                variant={selectedTheme === themeName ? 'default' : 'outline'}
                onClick={() => applyTheme(themeName)}
                className="capitalize"
              >
                {themeName}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filtres personnalisés</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Masquer' : 'Afficher'} avancé
            </Button>
          </div>

          {/* Filtres de base */}
          <div className="space-y-4">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">{filter.name}</label>
                  <span className="text-sm text-gray-600">
                    {filter.value}{filter.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={filter.min}
                  max={filter.max}
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Filtres avancés */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t">
              {Object.values(PREDEFINED_FILTERS)
                .filter((f) => !filters.find((af) => af.id === f.id))
                .map((filter) => (
                  <div key={filter.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">{filter.name}</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFilters = [...filters, { ...filter }];
                          setFilters(newFilters);
                          applyFilters(newFilters);
                          onFilterChange?.(newFilters);
                        }}
                      >
                        Ajouter
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Effets AR */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Effets AR</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="faceDetection"
                checked={effects.some((e) => e.id === 'faceDetection' && e.enabled)}
                onChange={() => toggleEffect('faceDetection')}
                className="w-4 h-4"
              />
              <label htmlFor="faceDetection" className="text-sm">
                Détection de visage
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stickers"
                checked={effects.some((e) => e.id === 'stickers' && e.enabled)}
                onChange={() => toggleEffect('stickers')}
                className="w-4 h-4"
              />
              <label htmlFor="stickers" className="text-sm">
                Stickers animés
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="particles"
                checked={effects.some((e) => e.id === 'particles' && e.enabled)}
                onChange={() => toggleEffect('particles')}
                className="w-4 h-4"
              />
              <label htmlFor="particles" className="text-sm">
                Effets de particules
              </label>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetFilters}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ARFilters;
