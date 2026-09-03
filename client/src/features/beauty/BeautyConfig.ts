export interface BeautyConfig {
  smoothSkin?: number;
  skinTexture?: number;
  brightenSkin?: number;
  darkCircles?: number;
  eyeBrilliance?: number;
  smileLines?: number;
  enlargeEyes?: number;
  slimFace?: number;
  whitenTeeth?: number;
  enlargeLips?: number;
  symmetry?: number;
}

export const DEFAULT_BEAUTY_CONFIG: Required<BeautyConfig> = {
  smoothSkin: 0.72,
  skinTexture: 0.68,
  brightenSkin: 0.08,
  darkCircles: 0.28,
  eyeBrilliance: 0.18,
  smileLines: 0.18,
  enlargeEyes: 0,
  slimFace: 0,
  whitenTeeth: 0,
  enlargeLips: 0,
  symmetry: 0,
};

export function normalizeBeautyConfig(config?: BeautyConfig | null): Required<BeautyConfig> {
  return {
    smoothSkin: clamp(config?.smoothSkin ?? DEFAULT_BEAUTY_CONFIG.smoothSkin),
    skinTexture: clamp(config?.skinTexture ?? DEFAULT_BEAUTY_CONFIG.skinTexture),
    brightenSkin: clamp(config?.brightenSkin ?? DEFAULT_BEAUTY_CONFIG.brightenSkin),
    darkCircles: clamp(config?.darkCircles ?? DEFAULT_BEAUTY_CONFIG.darkCircles),
    eyeBrilliance: clamp(config?.eyeBrilliance ?? DEFAULT_BEAUTY_CONFIG.eyeBrilliance),
    smileLines: clamp(config?.smileLines ?? DEFAULT_BEAUTY_CONFIG.smileLines),
    enlargeEyes: clamp(config?.enlargeEyes ?? DEFAULT_BEAUTY_CONFIG.enlargeEyes),
    slimFace: clamp(config?.slimFace ?? DEFAULT_BEAUTY_CONFIG.slimFace),
    whitenTeeth: clamp(config?.whitenTeeth ?? DEFAULT_BEAUTY_CONFIG.whitenTeeth),
    enlargeLips: clamp(config?.enlargeLips ?? DEFAULT_BEAUTY_CONFIG.enlargeLips),
    symmetry: clamp(config?.symmetry ?? DEFAULT_BEAUTY_CONFIG.symmetry),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
