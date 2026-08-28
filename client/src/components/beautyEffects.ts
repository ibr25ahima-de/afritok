import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, Point, center, getFaceGeometry, getPoints } from "./faceUtils";

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

const tempCanvasBySource = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 3) return false;
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.closePath();
  return true;
}
function tempFor(canvas: HTMLCanvasElement, w: number, h: number) {
  let t = tempCanvasBySource.get(canvas);
  if (!t) { t = document.createElement("canvas"); tempCanvasBySource.set(canvas, t); }
  if (t.width !== w || t.height !== h) { t.width = w; t.height = h; }
  return t;
}

/** TikTok-inspired face retouch: smooth uneven texture while preserving eyes/lips/contours. */
export function applySkinBeauty(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (!landmarks?.length || amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  const oval = getPoints(landmarks, LM.faceOval, width, height);
  if (oval.length < 3 || face.width < 20 || face.height < 20) return;

  const source = tempFor(ctx.canvas, Math.min(720, width), Math.min(720, Math.round(height * Math.min(1, 720 / Math.max(width, height)))));
  const sw = source.width, sh = source.height;
  const sctx = source.getContext("2d"); if (!sctx) return;
  sctx.clearRect(0, 0, sw, sh);
  sctx.filter = `blur(${(3.5 + 4.5 * clamp01(amount)).toFixed(1)}px) saturate(${(0.94 + amount * 0.02).toFixed(2)}) brightness(${(1.005 + amount * 0.012).toFixed(3)})`;
  sctx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, sw, sh);
  sctx.filter = "none";

  ctx.save();
  polygon(ctx, oval);
  // Preserve the most important facial details: eyes, lips and nose center.
  const protectedRegions = [
    getPoints(landmarks, LM.leftEye, width, height),
    getPoints(landmarks, LM.rightEye, width, height),
    getPoints(landmarks, LM.outerLips, width, height),
    getPoints(landmarks, LM.nose, width, height),
  ];
  for (const p of protectedRegions) {
    if (p.length < 3) continue;
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.closePath();
  }
  try { ctx.clip("evenodd"); } catch { ctx.clip(); }
  ctx.globalAlpha = 0.62 + 0.22 * clamp01(amount);
  ctx.drawImage(source, 0, 0, sw, sh, 0, 0, width, height);
  ctx.restore();
}

function applyBrightenSkin(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (!landmarks?.length || amount <= 0) return;
  const points = getPoints(landmarks, LM.faceOval, width, height); if (points.length < 3) return;
  const face = getFaceGeometry(landmarks, width, height);
  ctx.save(); polygon(ctx, points); ctx.clip();
  ctx.globalAlpha = Math.min(0.12, amount * 0.12);
  ctx.fillStyle = "white";
  ctx.fillRect(face.left, face.top, face.width, face.height);
  ctx.restore();
}

function applyLocalScale(ctx: CanvasRenderingContext2D, c: Point, rx: number, ry: number, scale: number) {
  if (Math.abs(scale - 1) < 0.002) return;
  const x = Math.max(0, Math.floor(c.x - rx * 1.25));
  const y = Math.max(0, Math.floor(c.y - ry * 1.25));
  const w = Math.min(ctx.canvas.width - x, Math.ceil(rx * 2.5));
  const h = Math.min(ctx.canvas.height - y, Math.ceil(ry * 2.5));
  if (w < 8 || h < 8) return;
  const crop = tempFor(ctx.canvas, w, h);
  const cc = crop.getContext("2d"); if (!cc) return;
  cc.clearRect(0, 0, w, h); cc.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.translate(c.x, c.y); ctx.scale(scale, scale); ctx.translate(-c.x, -c.y); ctx.drawImage(crop, x, y, w, h); ctx.restore();
}

function applyEnlargeEyes(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const strength = Math.min(0.16, amount * 0.16);
  for (const indices of [LM.leftEye, LM.rightEye]) {
    const points = getPoints(landmarks, indices, width, height); if (points.length < 3) continue;
    const c = center(points); applyLocalScale(ctx, c, Math.max(20, width * .047), Math.max(16, height * .040), 1 + strength);
  }
}

function applySlimFace(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height); if (face.width < 20) return;
  // Scale inward around the face center: cheeks/jaw become subtly narrower.
  applyLocalScale(ctx, { x: face.cx, y: face.cy }, face.width * .47, face.height * .44, 1 - Math.min(.075, amount * .075));
}

function applyWhitenTeeth(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const points = getPoints(landmarks, LM.innerLips, width, height); if (points.length < 3) return;
  const c = center(points), face = getFaceGeometry(landmarks, width, height);
  ctx.save(); polygon(ctx, points); ctx.clip(); ctx.globalAlpha = Math.min(.22, amount * .22);
  ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.beginPath(); ctx.ellipse(c.x, c.y, face.width*.10, face.height*.055, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
}

function applyEnlargeLips(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const points = getPoints(landmarks, LM.outerLips, width, height); if (points.length < 3) return;
  const c = center(points), face = getFaceGeometry(landmarks, width, height);
  applyLocalScale(ctx, c, Math.max(28, face.width*.17), Math.max(20, face.height*.105), 1 + Math.min(.14, amount*.14));
}

function applyDarkCircles(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  const eyePairs = [
    getPoints(landmarks, LM.leftEye, width, height),
    getPoints(landmarks, LM.rightEye, width, height),
  ];
  ctx.save(); ctx.filter = `blur(${Math.max(4, face.width*.018)}px)`; ctx.globalAlpha = Math.min(.16, amount*.16); ctx.fillStyle = "white";
  for (const eye of eyePairs) { if (eye.length < 3) continue; const c=center(eye); ctx.beginPath(); ctx.ellipse(c.x, c.y + face.height*.035, face.width*.075, face.height*.035, 0, 0, Math.PI*2); ctx.fill(); }
  ctx.restore();
}

function applyEyeBrilliance(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const alpha = Math.min(.16, amount*.16);
  for (const eye of [getPoints(landmarks, LM.leftEye, width, height), getPoints(landmarks, LM.rightEye, width, height)]) {
    if (eye.length < 3) continue;
    ctx.save(); polygon(ctx, eye); ctx.clip(); ctx.globalAlpha=alpha; ctx.fillStyle="white"; ctx.fill(); ctx.restore();
  }
}

function applySmileLines(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face=getFaceGeometry(landmarks,width,height), nose=getPoints(landmarks,LM.nose,width,height), lips=getPoints(landmarks,LM.outerLips,width,height);
  if (!nose.length || !lips.length) return;
  const n=center(nose), m=center(lips);
  ctx.save(); ctx.filter=`blur(${Math.max(4,face.width*.02)}px)`; ctx.globalAlpha=Math.min(.11,amount*.11); ctx.strokeStyle="white"; ctx.lineWidth=Math.max(3,face.width*.018); ctx.lineCap="round";
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(n.x+side*face.width*.035,n.y+face.height*.07);ctx.quadraticCurveTo(n.x+side*face.width*.11,m.y-face.height*.03,m.x+side*face.width*.12,m.y);ctx.stroke();}ctx.restore();
}

function applySymmetry(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const points=getPoints(landmarks,LM.faceOval,width,height); if(points.length<3)return;
  const face=getFaceGeometry(landmarks,width,height); ctx.save(); polygon(ctx,points); ctx.clip(); ctx.globalAlpha=Math.min(.06,amount*.06); ctx.fillStyle="white"; ctx.fillRect(face.left,face.top,face.width,face.height); ctx.restore();
}

export function applyBeautyEffects(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, config: BeautyConfig) {
  if (!landmarks?.length) return;
  const skin = Math.max(config.smoothSkin ?? 0, config.skinTexture ?? 0);
  applySkinBeauty(ctx, landmarks, width, height, skin);
  applyBrightenSkin(ctx, landmarks, width, height, config.brightenSkin ?? 0);
  applyDarkCircles(ctx, landmarks, width, height, config.darkCircles ?? 0);
  applyEyeBrilliance(ctx, landmarks, width, height, config.eyeBrilliance ?? 0);
  applySmileLines(ctx, landmarks, width, height, config.smileLines ?? 0);
  applyEnlargeEyes(ctx, landmarks, width, height, config.enlargeEyes ?? 0);
  applySlimFace(ctx, landmarks, width, height, config.slimFace ?? 0);
  applyWhitenTeeth(ctx, landmarks, width, height, config.whitenTeeth ?? 0);
  applyEnlargeLips(ctx, landmarks, width, height, config.enlargeLips ?? 0);
  applySymmetry(ctx, landmarks, width, height, config.symmetry ?? 0);
}
