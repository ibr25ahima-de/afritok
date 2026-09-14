const EFFECT_FILTERS: Record<string, string> = {
  "over-vignette": "brightness(.92) contrast(1.08)",
  "over-grain": "contrast(1.12) saturate(.9)",
  "over-chromatic": "saturate(1.35) contrast(1.08)",
  "over-bloom": "brightness(1.08) saturate(1.12)",
  "over-light-leak": "brightness(1.16) sepia(.12) saturate(1.18)",
  "over-halo": "brightness(1.1) contrast(1.04)",
  "trans-blur": "blur(1.6px)",
  "trans-pixelate": "contrast(1.2) saturate(.75)",
  "trans-glitch": "contrast(1.35) saturate(1.4) hue-rotate(8deg)",
  "part-fire": "brightness(1.08) saturate(1.45) sepia(.18)",
  "part-snow": "brightness(1.12) contrast(.92)",
  "part-sparkles": "brightness(1.14) saturate(1.18)",
};

/** Combines the selected library filter and effect into a CSS/Canvas filter. */
export function montageFilter(baseFilter: string | undefined, effectId: string | null) {
  return [baseFilter || "none", effectId ? EFFECT_FILTERS[effectId] || "none" : "none"]
    .filter(Boolean)
    .join(" ");
}

export const availableEffectFilters = EFFECT_FILTERS;

export default montageFilter;
