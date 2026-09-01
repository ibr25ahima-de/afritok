import React, { useEffect, useRef } from 'react';

export interface AREffect {
  id: string;
  name: string;
  category: 'beauty';
  thumbnail: string;
  description: string;
  beautyConfig?: {
    smoothSkin?: number; skinTexture?: number; brightenSkin?: number; darkCircles?: number;
    eyeBrilliance?: number; smileLines?: number; enlargeEyes?: number; slimFace?: number;
    whitenTeeth?: number; enlargeLips?: number; symmetry?: number;
  };
}

// TikTok-inspired presets. They use the same kinds of controls TikTok documents
// for Face Retouch (skin texture, eye brilliance, dark circles, smile lines)
// plus local face-shape controls implemented by our own canvas engine.
export const AR_EFFECTS: AREffect[] = [
  { id:'beauty-none', name:'Aucun', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face', description:'Beauté de base toujours active', beautyConfig:{} },
  { id:'beauty-natural', name:'Naturel', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', description:'Retouche douce et regard plus net', beautyConfig:{skinTexture:.70,smoothSkin:.68,brightenSkin:.10,darkCircles:.35,eyeBrilliance:.28,smileLines:.25} },
  { id:'beauty-foundation', name:'Fond de teint', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', description:'Peau très uniforme, imperfections fortement atténuées', beautyConfig:{skinTexture:1,smoothSkin:1,brightenSkin:.10,darkCircles:.62,smileLines:.55,eyeBrilliance:.20} },
  { id:'beauty-porcelain', name:'Porcelaine', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face', description:'Peau très lisse avec finition lumineuse', beautyConfig:{skinTexture:1,smoothSkin:1,brightenSkin:.18,darkCircles:.70,smileLines:.72,eyeBrilliance:.30} },
  { id:'beauty-glow', name:'Glow', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face', description:'Éclat visible et peau polie', beautyConfig:{skinTexture:.82,smoothSkin:.80,brightenSkin:.60,darkCircles:.42,eyeBrilliance:.70,smileLines:.30} },
  { id:'beauty-big-eyes', name:'Grands yeux', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face', description:'Yeux visiblement agrandis et regard éclairci', beautyConfig:{skinTexture:.62,smoothSkin:.62,enlargeEyes:1,eyeBrilliance:.78,darkCircles:.35} },
  { id:'beauty-slim', name:'Visage fin', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&h=120&fit=crop&crop=face', description:'Joues et mâchoire affinées avec retouche', beautyConfig:{skinTexture:.68,smoothSkin:.65,slimFace:1,symmetry:.25,darkCircles:.30} },
  { id:'beauty-full-lips', name:'Lèvres pulpeuses', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face', description:'Lèvres réellement volumisées et peau retouchée', beautyConfig:{skinTexture:.65,smoothSkin:.62,enlargeLips:1,brightenSkin:.08} },
  { id:'beauty-retouch', name:'Retouche', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face', description:'Retouche complète visage + regard + peau', beautyConfig:{skinTexture:1,smoothSkin:1,darkCircles:.85,eyeBrilliance:.70,smileLines:.75,brightenSkin:.16} },
  { id:'beauty-symmetry', name:'Harmonie', category:'beauty', thumbnail:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face', description:'Peau lisse et harmonisation légère du visage', beautyConfig:{skinTexture:.72,smoothSkin:.70,symmetry:1,eyeBrilliance:.35,darkCircles:.40} },
];

export const CATEGORIES = [{ id:'beauty', name:'Beauté', icon:'✨' }];

interface EffectsPanelProps { selectedEffect: AREffect | null; onSelectEffect:(effect:AREffect|null)=>void; }

export const EffectsPanel:React.FC<EffectsPanelProps>=({selectedEffect,onSelectEffect})=>{
 const scrollRef=useRef<HTMLDivElement>(null);const selectedId=selectedEffect?.id??'beauty-none';
 useEffect(()=>{const container=scrollRef.current;const selected=container?.querySelector<HTMLElement>(`[data-effect-id="${selectedId}"]`);if(!container||!selected)return;requestAnimationFrame(()=>selected.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));},[selectedId]);
 return <div className="fixed left-0 right-0 bottom-[108px] z-[60] pointer-events-none"><div className="mx-auto max-w-[680px] w-full bg-black/45 backdrop-blur-md rounded-2xl py-1 pointer-events-auto"><div ref={scrollRef} className="flex items-end gap-3 overflow-x-auto no-scrollbar px-[calc(50vw-34px)] py-1 scroll-smooth snap-x snap-mandatory" style={{WebkitOverflowScrolling:'touch',touchAction:'pan-x'}}>{AR_EFFECTS.map(effect=>{const selected=selectedId===effect.id;return <button key={effect.id} type="button" data-effect-id={effect.id} onClick={()=>onSelectEffect(effect.id==='beauty-none'?null:effect)} className={`flex-shrink-0 w-[68px] snap-center flex flex-col items-center gap-1 transition-transform duration-150 ${selected?'scale-110':'opacity-75'}`} aria-label={effect.name}><div className={`w-[60px] h-[60px] rounded-full overflow-hidden border-[3px] bg-black ${selected?'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]':'border-white/25'}`}><img src={effect.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" /></div><span className={`text-[10px] leading-3 font-semibold truncate max-w-[68px] ${selected?'text-white':'text-white/75'}`}>{effect.name}</span></button>})}</div></div></div>;
};
export default EffectsPanel;
