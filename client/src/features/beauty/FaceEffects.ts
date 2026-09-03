import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "@/components/EffectsPanel";
import { LM, getFaceGeometry, getPoints } from "@/components/faceUtils";

type Point = { x: number; y: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function points(l: NormalizedLandmark[], ids: number[], w: number, h: number) { return getPoints(l, ids, w, h); }
function center(p: Point[]): Point { if (!p.length) return { x: 0, y: 0 }; const s = p.reduce((a, q) => ({ x: a.x + q.x, y: a.y + q.y }), { x: 0, y: 0 }); return { x: s.x / p.length, y: s.y / p.length }; }
function eyeCenters(l: NormalizedLandmark[], w: number, h: number) { return [center(points(l, LM.leftEye, w, h)), center(points(l, LM.rightEye, w, h))]; }
function headAngle(l: NormalizedLandmark[], w: number, h: number) { const [a,b] = eyeCenters(l,w,h); return Math.atan2(b.y-a.y,b.x-a.x); }
function ellipse(ctx: CanvasRenderingContext2D, p: Point, rx: number, ry: number, fill?: string, stroke?: string, line = 1, rotation = 0) { ctx.beginPath(); ctx.ellipse(p.x,p.y,rx,ry,rotation,0,Math.PI*2); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();} }
function polygon(ctx: CanvasRenderingContext2D, p: Point[], fill?: string, stroke?: string, line = 1) { if(p.length<3)return; ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();} }
function line(ctx: CanvasRenderingContext2D, p: Point[], stroke: string, width: number) { if(p.length<2)return;ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineCap="round";ctx.stroke(); }

function drawCat(ctx: CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number){
 const f=getFaceGeometry(l,w,h), a=headAngle(l,w,h), ca=Math.cos(a), sa=Math.sin(a);
 const local=(x:number,y:number):Point=>({x:f.cx+x*ca-y*sa,y:f.top+y*ca+x*sa});
 const ears=[local(-f.width*.22,-f.height*.02),local(f.width*.22,-f.height*.02)];
 ears.forEach((e,i)=>{const dir=i?1:-1;polygon(ctx,[{x:e.x-f.width*.14*dir,y:e.y+f.height*.06},{x:e.x-f.width*.03*dir,y:e.y-f.height*.25},{x:e.x+f.width*.13*dir,y:e.y+f.height*.08}],"rgba(246,100,165,.88)","rgba(255,255,255,.9)",2);});
 const eyes=eyeCenters(l,w,h);eyes.forEach(e=>{ellipse(ctx,e,f.width*.055,f.height*.024,"rgba(20,10,20,.88)");ellipse(ctx,{x:e.x,y:e.y-f.height*.008},f.width*.018,f.height*.008,"rgba(255,255,255,.9)");});
 const nose=center(points(l,LM.nose,w,h));ellipse(ctx,{x:nose.x,y:nose.y+f.height*.015},f.width*.026,f.height*.018,"rgba(255,105,160,.95)");
 line(ctx,[{x:nose.x-f.width*.015,y:nose.y+f.height*.03},{x:nose.x-f.width*.13,y:nose.y+f.height*.015}],"rgba(255,255,255,.78)",1.5);line(ctx,[{x:nose.x+f.width*.015,y:nose.y+f.height*.03},{x:nose.x+f.width*.13,y:nose.y+f.height*.015}],"rgba(255,255,255,.78)",1.5);
}

function drawBunny(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number){
 const f=getFaceGeometry(l,w,h),a=headAngle(l,w,h);ctx.save();ctx.translate(f.cx,f.top-f.height*.16);ctx.rotate(a);
 [-1,1].forEach(side=>{ellipse(ctx,{x:side*f.width*.20,y:0},f.width*.105,f.height*.30,"rgba(245,220,230,.78)","rgba(255,255,255,.92)",2);ellipse(ctx,{x:side*f.width*.20,y:0},f.width*.052,f.height*.22,"rgba(235,120,160,.55)");});ctx.restore();
 const mouth=center(points(l,LM.outerLips,w,h));ellipse(ctx,mouth,f.width*.055,f.height*.035,"rgba(250,120,150,.72)");
}

function drawGlasses(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,style:"dark"|"heart"){
 const f=getFaceGeometry(l,w,h),eyes=eyeCenters(l,w,h),a=headAngle(l,w,h);
 if(style==="heart"){eyes.forEach(e=>{const s=f.width*.07;polygon(ctx,[{x:e.x,y:e.y+s*.9},{x:e.x-s*1.35,y:e.y-s*.35},{x:e.x-s*.72,y:e.y-s*1.05},{x:e.x,y:e.y-s*.35},{x:e.x+s*.72,y:e.y-s*1.05},{x:e.x+s*1.35,y:e.y-s*.35}],"rgba(255,55,105,.82)","rgba(255,255,255,.9)",2);});return;}
 eyes.forEach(e=>ellipse(ctx,e,f.width*.13,f.height*.068,"rgba(10,15,24,.76)","rgba(255,255,255,.95)",Math.max(2,f.width*.009),a));
 line(ctx,[{x:eyes[0].x+f.width*.105,y:eyes[0].y},{x:eyes[1].x-f.width*.105,y:eyes[1].y}],"rgba(255,255,255,.9)",Math.max(2,f.width*.008));
}

function drawCrown(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number){
 const f=getFaceGeometry(l,w,h),a=headAngle(l,w,h);ctx.save();ctx.translate(f.cx,f.top-f.height*.075);ctx.rotate(a);polygon(ctx,[{x:-f.width*.31,y:f.height*.10},{x:-f.width*.23,y:-f.height*.09},{x:-f.width*.09,y:f.height*.025},{x:0,y:-f.height*.14},{x:f.width*.09,y:f.height*.025},{x:f.width*.23,y:-f.height*.09},{x:f.width*.31,y:f.height*.10}],"rgba(255,204,48,.94)","rgba(255,255,255,.96)",2);line(ctx,[{x:-f.width*.31,y:f.height*.10},{x:f.width*.31,y:f.height*.10}],"rgba(255,255,255,.96)",Math.max(2,f.width*.009));ctx.restore();
}

function drawMakeup(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number,strong=false){
 const f=getFaceGeometry(l,w,h),eyes=eyeCenters(l,w,h),a=headAngle(l,w,h),power=strong?.72:.48;
 eyes.forEach(e=>{
   ctx.save();ctx.translate(e.x,e.y);ctx.rotate(a);
   const g=ctx.createLinearGradient(0,-f.height*.06,0,f.height*.055);g.addColorStop(0,`rgba(120,55,170,${power*.62})`);g.addColorStop(1,"rgba(255,120,180,0)");ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,f.width*.105,f.height*.052,0,0,Math.PI*2);ctx.fill();
   line(ctx,[{x:-f.width*.095,y:-f.height*.012},{x:-f.width*.025,y:-f.height*.028},{x:f.width*.05,y:-f.height*.018},{x:f.width*.105,y:-f.height*.002}],`rgba(35,18,35,${strong?.88:.70})`,Math.max(1.5,f.width*.006));
   ellipse(ctx,{x:0,y:0},f.width*.028,f.height*.016,"rgba(255,255,255,.22)");ctx.restore();
 });
 const cheeks=[{x:f.cx-f.width*.255,y:f.cy+f.height*.105},{x:f.cx+f.width*.255,y:f.cy+f.height*.105}];cheeks.forEach(c=>{ctx.save();ctx.filter=`blur(${Math.max(5,f.width*.035)}px)`;ellipse(ctx,c,f.width*.11,f.height*.06,`rgba(255,72,120,${strong?.28:.20})`);ctx.restore();});
 const lips=points(l,LM.outerLips,w,h);polygon(ctx,lips,`rgba(232,55,105,${strong?.54:.38})`);
}

function drawFreckles(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number){const f=getFaceGeometry(l,w,h),n=center(points(l,LM.nose,w,h));for(let i=-5;i<=5;i++)for(let j=0;j<2;j++){const x=n.x+i*f.width*.038+(j?.012*f.width:0),y=n.y+f.height*(.08+j*.038)+Math.abs(i)*f.height*.006;ellipse(ctx,{x,y},f.width*.0065,f.width*.0065,"rgba(125,70,45,.64)");}}
function drawTears(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number){const f=getFaceGeometry(l,w,h);eyeCenters(l,w,h).forEach(e=>{const p=[{x:e.x,y:e.y+f.height*.035},{x:e.x-f.width*.018,y:e.y+f.height*.15},{x:e.x,y:e.y+f.height*.21},{x:e.x+f.width*.018,y:e.y+f.height*.15}];polygon(ctx,p,"rgba(75,185,255,.70)");ellipse(ctx,{x:e.x-f.width*.006,y:e.y+f.height*.12},f.width*.008,f.height*.018,"rgba(255,255,255,.75)");});}
function drawNeon(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number){const f=getFaceGeometry(l,w,h),oval=points(l,LM.faceOval,w,h);ctx.save();ctx.shadowBlur=Math.max(8,f.width*.035);ctx.shadowColor="rgba(70,220,255,.95)";line(ctx,[...oval,oval[0]],"rgba(90,235,255,.84)",Math.max(2,f.width*.007));ctx.restore();eyeCenters(l,w,h).forEach(e=>ellipse(ctx,e,f.width*.058,f.height*.027,"rgba(40,255,210,.28)","rgba(90,255,240,.95)",2));}
function drawSparkles(ctx:CanvasRenderingContext2D,l:NormalizedLandmark[],w:number,h:number){const f=getFaceGeometry(l,w,h),t=performance.now()/500;const pts=[{x:f.left+f.width*.12,y:f.top+f.height*.25},{x:f.right-f.width*.12,y:f.top+f.height*.28},{x:f.left+f.width*.18,y:f.cy+f.height*.18},{x:f.right-f.width*.18,y:f.cy+f.height*.14}];pts.forEach((p,i)=>{const s=f.width*(.018+.012*(.5+.5*Math.sin(t+i)));line(ctx,[{x:p.x-s*2,y:p.y},{x:p.x+s*2,y:p.y}],"rgba(255,245,180,.9)",2);line(ctx,[{x:p.x,y:p.y-s*2},{x:p.x,y:p.y+s*2}],"rgba(255,255,255,.9)",2);});}

export function renderFaceEffect(ctx:CanvasRenderingContext2D,landmarks:NormalizedLandmark[],width:number,height:number,effect:AREffect|null){if(!effect||!landmarks?.length)return;ctx.save();try{switch(effect.id){case"effect-cat":drawCat(ctx,landmarks,width,height);break;case"effect-bunny":drawBunny(ctx,landmarks,width,height);break;case"effect-sunglasses":drawGlasses(ctx,landmarks,width,height,"dark");break;case"effect-heart-eyes":drawGlasses(ctx,landmarks,width,height,"heart");break;case"effect-crown":drawCrown(ctx,landmarks,width,height);break;case"effect-makeup":drawMakeup(ctx,landmarks,width,height,false);break;case"effect-glam":drawMakeup(ctx,landmarks,width,height,true);break;case"effect-freckles":drawFreckles(ctx,landmarks,width,height);break;case"effect-tears":drawTears(ctx,landmarks,width,height);break;case"effect-neon":drawNeon(ctx,landmarks,width,height);break;case"effect-sparkles":drawSparkles(ctx,landmarks,width,height);break;}}finally{ctx.restore();}}
