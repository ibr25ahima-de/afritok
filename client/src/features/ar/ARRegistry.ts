import type { BeautyConfig } from "@/features/beauty/BeautyConfig";

export type EffectRenderer = "none" | "cat" | "bunny" | "sunglasses" | "heart-eyes" | "crown" | "makeup" | "glam" | "freckles" | "tears" | "neon";

export interface AREffect {
  id: string;
  name: string;
  category: "beauty" | "creative";
  renderer: EffectRenderer;
  thumbnail: string;
  description: string;
  beautyConfig?: BeautyConfig;
}

// Real photographic previews. These are deliberately real portraits rather than
// generated SVG faces: the card is meant to show the visual direction of the
// effect before the user activates it.
const P = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=240&h=240&fit=crop`;

const PHOTO = {
  natural: P(20000981),
  soft: P(25293894),
  foundation: P(18656574),
  porcelain: P(8727441),
  glow: P(13474565),
  eyes: P(14862077),
  slim: P(14512646),
  lips: P(39105265),
  retouch: P(16809186),
  harmony: P(20463326),
  cat: P(19231325),
  bunny: P(26447070),
  glasses: P(12440285),
  hearts: P(11515424),
  crown: P(20681743),
  makeup: P(11602351),
  glam: P(36327150),
  freckles: P(20427501),
  tears: P(20463326),
  neon: P(16527218),
};

const NO_BEAUTY: BeautyConfig = {
  smoothSkin: 0,
  skinTexture: 0,
  brightenSkin: 0,
  darkCircles: 0,
  eyeBrilliance: 0,
  smileLines: 0,
  enlargeEyes: 0,
  slimFace: 0,
  whitenTeeth: 0,
  enlargeLips: 0,
  symmetry: 0,
};

const B = (id: string, name: string, config: BeautyConfig, thumbnail: string, description: string) => ({
  id, name, category: "beauty" as const, renderer: "none" as const, beautyConfig: config, thumbnail, description,
});
const C = (id: string, name: string, renderer: EffectRenderer, thumbnail: string, description: string) => ({
  id, name, category: "creative" as const, renderer, thumbnail, description,
});

export const AR_EFFECTS: AREffect[] = [
  B("beauty-none", "Naturel", NO_BEAUTY, PHOTO.natural, "Aucune retouche : rendu caméra naturel."),
  B("beauty-natural", "Doux", { smoothSkin: .62, skinTexture: .58, brightenSkin: .03, darkCircles: .22, eyeBrilliance: .18, smileLines: .16 }, PHOTO.soft, "Adoucissement léger et naturel du visage."),
  B("beauty-foundation", "Fond de teint", { smoothSkin: .82, skinTexture: .72, brightenSkin: .04, darkCircles: .38, smileLines: .32, eyeBrilliance: .14 }, PHOTO.foundation, "Peau plus uniforme avec correction renforcée."),
  // Porcelain means smooth/even skin, not whitening the person's complexion.
  B("beauty-porcelain", "Porcelaine", { smoothSkin: .78, skinTexture: .62, brightenSkin: .04, darkCircles: .22, smileLines: .18, eyeBrilliance: .16 }, PHOTO.porcelain, "Peau lissée et uniforme sans blanchir le teint."),
  B("beauty-glow", "Glow", { smoothSkin: .72, skinTexture: .68, brightenSkin: .28, darkCircles: .28, eyeBrilliance: .38, smileLines: .20 }, PHOTO.glow, "Éclat renforcé et regard lumineux."),
  B("beauty-big-eyes", "Grands yeux", { smoothSkin: .52, skinTexture: .50, enlargeEyes: 1, eyeBrilliance: .45, darkCircles: .24 }, PHOTO.eyes, "Accentuation du regard et des yeux."),
  B("beauty-slim", "Visage fin", { smoothSkin: .55, skinTexture: .54, slimFace: 1, symmetry: .20, darkCircles: .22 }, PHOTO.slim, "Sculpt du visage avec contour plus fin."),
  B("beauty-full-lips", "Lèvres", { smoothSkin: .52, skinTexture: .50, enlargeLips: 1, brightenSkin: .03 }, PHOTO.lips, "Accentuation des lèvres."),
  B("beauty-retouch", "Retouche", { smoothSkin: .80, skinTexture: .70, darkCircles: .40, eyeBrilliance: .38, smileLines: .34, brightenSkin: .04 }, PHOTO.retouch, "Retouche complète du visage."),
  B("beauty-symmetry", "Harmonie", { smoothSkin: .58, skinTexture: .56, symmetry: 1, eyeBrilliance: .20, darkCircles: .25 }, PHOTO.harmony, "Harmonisation légère des traits."),
  C("effect-cat", "Chat", "cat", PHOTO.cat, "Oreilles, yeux, nez et moustaches suivent le visage."),
  C("effect-bunny", "Lapin", "bunny", PHOTO.bunny, "Oreilles et nez de lapin suivent le mouvement de la tête."),
  C("effect-sunglasses", "Lunettes", "sunglasses", PHOTO.glasses, "Lunettes verrouillées sur les yeux et orientées avec la tête."),
  C("effect-heart-eyes", "Cœurs", "heart-eyes", PHOTO.hearts, "Cœurs animés centrés sur les yeux."),
  C("effect-crown", "Couronne", "crown", PHOTO.crown, "Couronne orientée avec l'inclinaison de la tête."),
  C("effect-makeup", "Make-up", "makeup", PHOTO.makeup, "Fard, eyeliner, blush et lèvres suivent les zones du visage."),
  C("effect-glam", "Glam", "glam", PHOTO.glam, "Maquillage plus intense avec contour et lèvres accentuées."),
  C("effect-freckles", "Taches", "freckles", PHOTO.freckles, "Taches de rousseur réparties sur le nez et les joues."),
  C("effect-tears", "Larmes", "tears", PHOTO.tears, "Larmes brillantes attachées aux yeux."),
  C("effect-neon", "Néon", "neon", PHOTO.neon, "Contour lumineux du visage et des yeux, suivi en temps réel."),
];

export const CATEGORIES = [
  { id: "beauty", name: "Beauté", icon: "✨" },
  { id: "creative", name: "Effets", icon: "🎭" },
];

export const EFFECTS = AR_EFFECTS;
