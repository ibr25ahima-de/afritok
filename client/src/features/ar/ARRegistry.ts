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

function svgThumb(renderer: EffectRenderer, beauty = false): string {
  const face = `<ellipse cx="60" cy="62" rx="31" ry="38" fill="#d99a72"/><ellipse cx="49" cy="58" rx="4" ry="5" fill="#241b1b"/><ellipse cx="71" cy="58" rx="4" ry="5" fill="#241b1b"/><path d="M52 78 Q60 84 68 78" fill="none" stroke="#7b3f35" stroke-width="2.5" stroke-linecap="round"/>`;
  let art = face;
  if (beauty) art += `<ellipse cx="60" cy="62" rx="34" ry="41" fill="none" stroke="white" stroke-opacity=".22" stroke-width="4"/>`;
  switch (renderer) {
    case "cat": art += `<path d="M31 31 L36 8 L50 27 M89 31 L84 8 L70 27" fill="#e879a9" stroke="white" stroke-width="2"/><path d="M60 68 l-5 4 5 3 5-3z" fill="#ff6b9d"/><path d="M53 72 L38 68 M67 72 L82 68" stroke="white" stroke-width="2"/>`; break;
    case "bunny": art += `<ellipse cx="43" cy="17" rx="9" ry="24" fill="#f5d9e3" stroke="white" stroke-width="2"/><ellipse cx="77" cy="17" rx="9" ry="24" fill="#f5d9e3" stroke="white" stroke-width="2"/><ellipse cx="60" cy="76" rx="7" ry="5" fill="#ff8fb0"/>`; break;
    case "sunglasses": art += `<rect x="29" y="48" width="27" height="19" rx="7" fill="#121821" stroke="white" stroke-width="2"/><rect x="64" y="48" width="27" height="19" rx="7" fill="#121821" stroke="white" stroke-width="2"/><path d="M56 54 Q60 50 64 54 M29 52 L19 49 M91 52 L101 49" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`; break;
    case "heart-eyes": art += `<path d="M49 64 C39 54 42 45 49 50 C56 45 59 54 49 64 M71 64 C61 54 64 45 71 50 C78 45 81 54 71 64" fill="#ff3d78" stroke="white" stroke-width="1.5"/>`; break;
    case "crown": art += `<path d="M29 34 L35 12 L48 27 L60 8 L72 27 L85 12 L91 34 Z" fill="#ffd43b" stroke="white" stroke-width="2"/><path d="M29 34 H91" stroke="#fff2a8" stroke-width="4"/>`; break;
    case "makeup": art += `<path d="M38 53 Q48 46 55 53" stroke="#7e3fa6" stroke-width="5" fill="none"/><path d="M65 53 Q72 46 82 53" stroke="#7e3fa6" stroke-width="5" fill="none"/><ellipse cx="42" cy="70" rx="9" ry="5" fill="#ff6b93" opacity=".7"/><ellipse cx="78" cy="70" rx="9" ry="5" fill="#ff6b93" opacity=".7"/><path d="M52 80 Q60 86 68 80" stroke="#e7356d" stroke-width="5" fill="none"/>`; break;
    case "glam": art += `<path d="M36 54 Q48 43 56 53 M64 53 Q72 43 84 54" stroke="#5d2b91" stroke-width="6" fill="none"/><ellipse cx="41" cy="72" rx="11" ry="6" fill="#ff4f87" opacity=".75"/><ellipse cx="79" cy="72" rx="11" ry="6" fill="#ff4f87" opacity=".75"/><path d="M50 80 Q60 88 70 80" stroke="#d91e59" stroke-width="7" fill="none"/>`; break;
    case "freckles": art += `<g fill="#8b5137">${Array.from({length:14},(_,i)=>{const x=43+(i%7)*5.7;const y=69+Math.floor(i/7)*7;return `<circle cx="${x}" cy="${y}" r="1.7"/>`}).join("")}</g>`; break;
    case "tears": art += `<path d="M49 66 C46 73 46 82 50 86 C54 82 54 74 50 68 M71 66 C68 73 68 82 72 86 C76 82 76 74 72 68" fill="#65c9ff" opacity=".85" stroke="white"/>`; break;
    case "neon": art += `<ellipse cx="60" cy="62" rx="34" ry="42" fill="none" stroke="#54efff" stroke-width="4"/><circle cx="49" cy="58" r="7" fill="none" stroke="#65ffd7" stroke-width="3"/><circle cx="71" cy="58" r="7" fill="none" stroke="#65ffd7" stroke-width="3"/>`; break;
  }
  const bg = beauty ? "#8d6fe8" : "#242938";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><radialGradient id="g"><stop stop-color="${bg}"/><stop offset="1" stop-color="#0e1118"/></radialGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/>${art}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const B = (id: string, name: string, config: BeautyConfig, description: string) => ({ id, name, category: "beauty" as const, renderer: "none" as const, beautyConfig: config, thumbnail: svgThumb("none", true), description });
const C = (id: string, name: string, renderer: EffectRenderer, description: string) => ({ id, name, category: "creative" as const, renderer, thumbnail: svgThumb(renderer), description });

export const AR_EFFECTS: AREffect[] = [
  B("beauty-none", "Naturel", { smoothSkin: .72, skinTexture: .78, brightenSkin: .10, darkCircles: .38, eyeBrilliance: .24, smileLines: .28 }, "Retouche naturelle active par défaut."),
  B("beauty-natural", "Doux", { smoothSkin: .68, skinTexture: .70, brightenSkin: .10, darkCircles: .35, eyeBrilliance: .28, smileLines: .25 }, "Adoucissement léger et naturel du visage."),
  B("beauty-foundation", "Fond de teint", { smoothSkin: 1, skinTexture: 1, brightenSkin: .10, darkCircles: .62, smileLines: .55, eyeBrilliance: .20 }, "Peau plus uniforme avec correction renforcée."),
  B("beauty-porcelain", "Porcelaine", { smoothSkin: 1, skinTexture: 1, brightenSkin: .18, darkCircles: .70, smileLines: .72, eyeBrilliance: .30 }, "Peau lissée avec rendu porcelaine."),
  B("beauty-glow", "Glow", { smoothSkin: .82, skinTexture: .82, brightenSkin: .60, darkCircles: .42, eyeBrilliance: .70, smileLines: .30 }, "Éclat renforcé et regard lumineux."),
  B("beauty-big-eyes", "Grands yeux", { smoothSkin: .62, skinTexture: .62, enlargeEyes: 1, eyeBrilliance: .78, darkCircles: .35 }, "Accentuation du regard et des yeux."),
  B("beauty-slim", "Visage fin", { smoothSkin: .65, skinTexture: .68, slimFace: 1, symmetry: .25, darkCircles: .30 }, "Sculpt du visage avec contour plus fin."),
  B("beauty-full-lips", "Lèvres", { smoothSkin: .62, skinTexture: .65, enlargeLips: 1, brightenSkin: .08 }, "Accentuation des lèvres."),
  B("beauty-retouch", "Retouche", { smoothSkin: 1, skinTexture: 1, darkCircles: .85, eyeBrilliance: .70, smileLines: .75, brightenSkin: .16 }, "Retouche complète du visage."),
  B("beauty-symmetry", "Harmonie", { smoothSkin: .70, skinTexture: .72, symmetry: 1, eyeBrilliance: .35, darkCircles: .40 }, "Harmonisation légère des traits."),
  C("effect-cat", "Chat", "cat", "Oreilles, yeux, nez et moustaches suivent le visage."),
  C("effect-bunny", "Lapin", "bunny", "Oreilles et nez de lapin suivent le mouvement de la tête."),
  C("effect-sunglasses", "Lunettes", "sunglasses", "Lunettes verrouillées sur les yeux et orientées avec la tête."),
  C("effect-heart-eyes", "Cœurs", "heart-eyes", "Cœurs animés centrés sur les yeux."),
  C("effect-crown", "Couronne", "crown", "Couronne orientée avec l'inclinaison de la tête."),
  C("effect-makeup", "Make-up", "makeup", "Fard, eyeliner, blush et lèvres suivent les zones du visage."),
  C("effect-glam", "Glam", "glam", "Maquillage plus intense avec contour et lèvres accentuées."),
  C("effect-freckles", "Taches", "freckles", "Taches de rousseur réparties sur le nez et les joues."),
  C("effect-tears", "Larmes", "tears", "Larmes brillantes attachées aux yeux."),
  C("effect-neon", "Néon", "neon", "Contour lumineux du visage et des yeux, suivi en temps réel."),
];

export const CATEGORIES = [
  { id: "beauty", name: "Beauté", icon: "✨" },
  { id: "creative", name: "Effets", icon: "🎭" },
];

export const EFFECTS = AR_EFFECTS;
