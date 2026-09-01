import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, Point, center, getFaceGeometry, getPoints } from "./faceUtils";

export interface BeautyConfig {
  smoothSkin?: number; skinTexture?: number; brightenSkin?: number; darkCircles?: number;
  eyeBrilliance?: number; smileLines?: number; enlargeEyes?: number; slimFace?: number;
  whitenTeeth?: number; enlargeLips?: number; symmetry?: number;
}

const tempCanvasBySource = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
function polygon(ctx:CanvasRenderingContext2D, points:Point[]){if(points.length<3)return false;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();return true;}
function tempFor(canvas:HTMLCanvasElement,w:number,h:number){let t=tempCanvasBySource.get(canvas);if(!t){t=document.createElement("canvas");tempCanvasBySource.set(canvas,t);}if(t.width!==w||t.height!==h){t.width=w;t.height=h;}return t;}

/** Mobile-first TikTok-inspired retouch: strong enough to be visible, but protects facial details. */
export function applySkinBeauty(ctx:CanvasRenderingContext2D,landmarks:NormalizedLandmark[],width:number,height:number,amount:number){
 if(!landmarks?.length||amount<=0)return;const face=getFaceGeometry(landmarks,width,height),oval=getPoints(landmarks,LM.faceOval,width,height);
 if(oval.length<3||face.width<20)return;
 const maxSide=Math.min(900,Math.max(480,Math.max(width,height))), scale=Math.min(1,maxSide/Math.max(width,height));
 const sw=Math.max(1,Math.round(width*scale)),sh=Math.max(1,Math.round(height*scale));const source=tempFor(ctx.canvas,sw,sh),sctx=source.getContext("2d");if(!sctx)return;
 sctx.clearRect(0,0,sw,sh);sctx.filter=`blur(${(4+7*clamp01(amount)).toFixed(1)}px) saturate(${(0.96+amount*.03).toFixed(2)}) brightness(${(1.006+amount*.014).toFixed(3)})`;
 sctx.drawImage(ctx.canvas,0,0,width,height,0,0,sw,sh);sctx.filter="none";
 ctx.save();polygon(ctx,oval);
 for(const p of [getPoints(landmarks,LM.leftEye,width,height),getPoints(landmarks,LM.rightEye,width,height),getPoints(landmarks,LM.outerLips,width,height),getPoints(landmarks,LM.nose,width,height)]){
  if(p.length<3)continue;ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();
 }
 try{ctx.clip("evenodd")}catch{ctx.clip()};ctx.globalAlpha=.72+.20*clamp01(amount);ctx.drawImage(source,0,0,sw,sh,0,0,width,height);ctx.restore();
}

function applyBrightenSkin(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const p=getPoints(l,LM.faceOval,w,h);if(p.length<3)return;const f=getFaceGeometry(l,w,h);ctx.save();polygon(ctx,p);ctx.clip();ctx.globalAlpha=Math.min(.15,a*.15);ctx.fillStyle="white";ctx.fillRect(f.left,f.top,f.width,f.height);ctx.restore();}

/** Draw a local region back at a larger/smaller scale. The strength is deliberately visible on mobile. */
function applyLocalScale(ctx:CanvasRenderingContext2D,c:Point,rx:number,ry:number,strength:number,maskRx=rx,maskRy=ry){
 if(Math.abs(strength)<.002)return;const x=Math.max(0,Math.floor(c.x-rx*1.35)),y=Math.max(0,Math.floor(c.y-ry*1.35));
 const w=Math.min(ctx.canvas.width-x,Math.ceil(rx*2.7)),hh=Math.min(ctx.canvas.height-y,Math.ceil(ry*2.7));if(w<10||hh<10)return;
 const crop=document.createElement("canvas");crop.width=w;crop.height=hh;const cc=crop.getContext("2d");if(!cc)return;cc.drawImage(ctx.canvas,x,y,w,hh,0,0,w,hh);
 ctx.save();ctx.beginPath();ctx.ellipse(c.x,c.y,maskRx,maskRy,0,0,Math.PI*2);ctx.clip();
 ctx.translate(c.x,c.y);ctx.scale(strength,strength);ctx.translate(-c.x,-c.y);ctx.drawImage(crop,x,y,w,hh);ctx.restore();
}

function applyEnlargeEyes(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const strength=1+Math.min(.30,a*.30);for(const ids of [LM.leftEye,LM.rightEye]){const p=getPoints(l,ids,w,h);if(p.length<3)continue;const c=center(p);applyLocalScale(ctx,c,Math.max(22,w*.055),Math.max(18,h*.045),strength,Math.max(27,w*.070),Math.max(21,h*.055));}}

function applySlimFace(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const f=getFaceGeometry(l,w,h);if(f.width<20)return;applyLocalScale(ctx,{x:f.cx,y:f.cy},f.width*.50,f.height*.45,1-Math.min(.12,a*.12),f.width*.50,f.height*.45);}

function applyWhitenTeeth(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const p=getPoints(l,LM.innerLips,w,h);if(p.length<3)return;const c=center(p),f=getFaceGeometry(l,w,h);ctx.save();polygon(ctx,p);ctx.clip();ctx.globalAlpha=Math.min(.30,a*.30);ctx.fillStyle="white";ctx.beginPath();ctx.ellipse(c.x,c.y,f.width*.11,f.height*.058,0,0,Math.PI*2);ctx.fill();ctx.restore();}

function applyEnlargeLips(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const p=getPoints(l,LM.outerLips,w,h);if(p.length<3)return;const c=center(p),f=getFaceGeometry(l,w,h);applyLocalScale(ctx,c,Math.max(30,f.width*.18),Math.max(22,f.height*.11),1+Math.min(.26,a*.26),Math.max(38,f.width*.22),Math.max(27,f.height*.14));}

function applyDarkCircles(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const f=getFaceGeometry(l,w,h);ctx.save();ctx.filter=`blur(${Math.max(4,f.width*.022)}px)`;ctx.globalAlpha=Math.min(.24,a*.24);ctx.fillStyle="white";for(const ids of [LM.leftEye,LM.rightEye]){const p=getPoints(l,ids,w,h);if(p.length<3)continue;const c=center(p);ctx.beginPath();ctx.ellipse(c.x,c.y+f.height*.040,f.width*.085,f.height*.040,0,0,Math.PI*2);ctx.fill();}ctx.restore();}

function applyEyeBrilliance(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const alpha=Math.min(.25,a*.25);for(const p of [getPoints(l,LM.leftEye,w,h),getPoints(l,LM.rightEye,w,h)]){if(p.length<3)continue;ctx.save();polygon(ctx,p);ctx.clip();ctx.globalAlpha=alpha;ctx.fillStyle="white";ctx.fill();ctx.restore();}}

function applySmileLines(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const f=getFaceGeometry(l,w,h),n=getPoints(l,LM.nose,w,h),m=getPoints(l,LM.outerLips,w,h);if(!n.length||!m.length)return;const nc=center(n),mc=center(m);ctx.save();ctx.filter=`blur(${Math.max(4,f.width*.022)}px)`;ctx.globalAlpha=Math.min(.16,a*.16);ctx.strokeStyle="white";ctx.lineWidth=Math.max(3,f.width*.022);ctx.lineCap="round";for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(nc.x+s*f.width*.035,nc.y+f.height*.07);ctx.quadraticCurveTo(nc.x+s*f.width*.12,mc.y-f.height*.03,mc.x+s*f.width*.13,mc.y);ctx.stroke();}ctx.restore();}

function applySymmetry(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,a:number){if(a<=0)return;const p=getPoints(l,LM.faceOval,w,h);if(p.length<3)return;const f=getFaceGeometry(l,w,h);ctx.save();polygon(ctx,p);ctx.clip();ctx.globalAlpha=Math.min(.09,a*.09);ctx.fillStyle="white";ctx.fillRect(f.left,f.top,f.width,f.height);ctx.restore();}

export function applyBeautyEffects(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,config:BeautyConfig){
 if(!l?.length)return;const skin=Math.max(config.smoothSkin??0,config.skinTexture??0);applySkinBeauty(ctx,l,w,h,skin);applyBrightenSkin(ctx,l,w,h,config.brightenSkin??0);
 applyDarkCircles(ctx,l,w,h,config.darkCircles??0);applyEyeBrilliance(ctx,l,w,h,config.eyeBrilliance??0);applySmileLines(ctx,l,w,h,config.smileLines??0);
 applyEnlargeEyes(ctx,l,w,h,config.enlargeEyes??0);applySlimFace(ctx,l,w,h,config.slimFace??0);applyWhitenTeeth(ctx,l,w,h,config.whitenTeeth??0);applyEnlargeLips(ctx,l,w,h,config.enlargeLips??0);applySymmetry(ctx,l,w,h,config.symmetry??0);
}
