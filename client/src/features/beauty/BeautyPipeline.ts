import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, getFaceGeometry, getPoints } from "@/components/faceUtils";
import type { BeautyConfig } from "./BeautyConfig";
import { normalizeBeautyConfig } from "./BeautyConfig";
import { applyBlemishReduction } from "./SkinRetouch";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
type Point = { x: number; y: number };

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 3) return false;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  return true;
}

function protectedRegions(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  for (const ids of [LM.leftEye, LM.rightEye, LM.outerLips, LM.nose]) {
    const p = getPoints(l, ids, w, h);
    if (p.length < 3) continue;
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.closePath();
  }
}

function retouchSkin(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, amount: number) {
  amount = clamp01(amount);
  if (amount <= 0) return;
  const face = getFaceGeometry(l, w, h);
  const oval = getPoints(l, LM.faceOval, w, h);
  if (oval.length < 3 || face.width < 20) return;

  const temp = document.createElement("canvas");
  const scale = Math.min(1, 800 / Math.max(w, h));
  temp.width = Math.max(1, Math.round(w * scale));
  temp.height = Math.max(1, Math.round(h * scale));
  const t = temp.getContext("2d");
  if (!t) return;

  t.filter = `blur(${(1.4 + amount * 2.2).toFixed(1)}px)`;
  t.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, temp.width, temp.height);
  t.filter = "none";

  ctx.save();
  polygon(ctx, oval);
  protectedRegions(ctx, l, w, h);
  try { ctx.clip("evenodd"); } catch { ctx.clip(); }
  ctx.globalAlpha = 0.10 + amount * 0.18;
  ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, w, h);
  ctx.restore();
}

function tone(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, amount: number) {
  amount = clamp01(amount);
  if (amount <= 0) return;
  const p = getPoints(l, LM.faceOval, w, h);
  if (p.length < 3) return;
  const f = getFaceGeometry(l, w, h);
  ctx.save();
  polygon(ctx, p);
  protectedRegions(ctx, l, w, h);
  try { ctx.clip("evenodd"); } catch { ctx.clip(); }
  const g = ctx.createRadialGradient(f.cx, f.cy - f.height * .12, f.width * .05, f.cx, f.cy, f.width * .72);
  g.addColorStop(0, `rgba(255,255,255,${0.055 * amount})`);
  g.addColorStop(0.65, `rgba(255,255,255,${0.020 * amount})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(f.left, f.top, f.width, f.height);
  ctx.restore();
}

function localScale(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, scale: number) {
  if (Math.abs(scale - 1) < .002) return;
  const padX = rx * 1.5, padY = ry * 1.5;
  const sx = Math.max(0, Math.floor(cx - padX));
  const sy = Math.max(0, Math.floor(cy - padY));
  const sw = Math.min(ctx.canvas.width - sx, Math.ceil(padX * 2));
  const sh = Math.min(ctx.canvas.height - sy, Math.ceil(padY * 2));
  if (sw < 12 || sh < 12) return;
  const crop = document.createElement("canvas");
  crop.width = sw; crop.height = sh;
  const c = crop.getContext("2d");
  if (!c) return;
  c.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
  ctx.drawImage(crop, sx, sy, sw, sh);
  ctx.restore();
}

function sculpt(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, c: Required<BeautyConfig>) {
  const f = getFaceGeometry(l, w, h);
  if (c.enlargeEyes > 0) {
    for (const ids of [LM.leftEye, LM.rightEye]) {
      const p = getPoints(l, ids, w, h);
      if (p.length < 3) continue;
      const cx = p.reduce((s, q) => s + q.x, 0) / p.length;
      const cy = p.reduce((s, q) => s + q.y, 0) / p.length;
      localScale(ctx, cx, cy, Math.max(24, f.width * .075), Math.max(18, f.height * .055), 1 + c.enlargeEyes * .18);
    }
  }
  if (c.enlargeLips > 0) {
    const p = getPoints(l, LM.outerLips, w, h);
    if (p.length >= 3) {
      const cx = p.reduce((s, q) => s + q.x, 0) / p.length;
      const cy = p.reduce((s, q) => s + q.y, 0) / p.length;
      localScale(ctx, cx, cy, Math.max(32, f.width * .21), Math.max(24, f.height * .13), 1 + c.enlargeLips * .14);
    }
  }
  if (c.slimFace > 0) localScale(ctx, f.cx, f.cy, f.width * .48, f.height * .43, 1 - c.slimFace * .055);
}

export function applyBeautyPipeline(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, config?: BeautyConfig) {
  if (!landmarks?.length) return;
  const c = normalizeBeautyConfig(config);
  const skinAmount = Math.max(c.smoothSkin, c.skinTexture);
  applyBlemishReduction(ctx, landmarks, width, height, skinAmount);
  retouchSkin(ctx, landmarks, width, height, skinAmount);
  tone(ctx, landmarks, width, height, c.brightenSkin);
  sculpt(ctx, landmarks, width, height, c);
}
