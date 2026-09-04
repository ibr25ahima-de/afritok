import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, getFaceGeometry, getPoints } from "@/components/faceUtils";
import type { BeautyConfig } from "./BeautyConfig";
import { normalizeBeautyConfig } from "./BeautyConfig";

type Point = { x: number; y: number };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 3) return false;
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); return true;
}

function protectedRegions(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  // Skin correction deliberately includes the nose. Only eyes and lips stay sharp.
  for (const ids of [LM.leftEye, LM.rightEye, LM.outerLips]) {
    const p = getPoints(l, ids, w, h); if (p.length < 3) continue;
    ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath();
  }
}

function retouchSkin(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, amount: number) {
  amount = clamp01(amount); if (amount <= 0) return;
  const face = getFaceGeometry(l, w, h), oval = getPoints(l, LM.faceOval, w, h);
  if (oval.length < 3 || face.width < 20) return;
  const temp = document.createElement("canvas");
  const scale = Math.min(1, 900 / Math.max(w, h)); temp.width = Math.max(1, Math.round(w * scale)); temp.height = Math.max(1, Math.round(h * scale));
  const t = temp.getContext("2d"); if (!t) return;
  t.filter = `blur(${(3 + amount * 5).toFixed(1)}px) saturate(.98)`; t.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, temp.width, temp.height); t.filter = "none";
  ctx.save(); polygon(ctx, oval); protectedRegions(ctx, l, w, h); try { ctx.clip("evenodd"); } catch { ctx.clip(); }
  ctx.globalAlpha = 0.28 + amount * 0.34; ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, w, h); ctx.restore();
}

function tone(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, amount: number) {
  amount = clamp01(amount); if (amount <= 0) return;
  const p = getPoints(l, LM.faceOval, w, h); if (p.length < 3) return;
  const f = getFaceGeometry(l, w, h); ctx.save(); polygon(ctx, p); protectedRegions(ctx, l, w, h); try { ctx.clip("evenodd"); } catch { ctx.clip(); }
  const g = ctx.createRadialGradient(f.cx, f.cy - f.height * .12, f.width * .05, f.cx, f.cy, f.width * .72);
  g.addColorStop(0, `rgba(255,255,255,${0.12 * amount})`); g.addColorStop(.65, `rgba(255,255,255,${0.045 * amount})`); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(f.left, f.top, f.width, f.height); ctx.restore();
}

function eyePolish(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, c: Required<BeautyConfig>) {
  const f = getFaceGeometry(l, w, h), eyes = [LM.leftEye, LM.rightEye];
  for (const ids of eyes) {
    const p = getPoints(l, ids, w, h); if (p.length < 3) continue;
    const e = { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length };
    if (c.darkCircles > 0) {
      ctx.save(); ctx.filter = `blur(${Math.max(5, f.width * .035)}px)`;
      ellipse(ctx, { x: e.x, y: e.y + f.height * .048 }, f.width * .105, f.height * .035, `rgba(255,205,185,${.10 + c.darkCircles * .16})`); ctx.restore();
    }
    if (c.eyeBrilliance > 0) {
      ctx.save(); const g = ctx.createRadialGradient(e.x - f.width * .015, e.y - f.height * .012, 0, e.x, e.y, f.width * .10);
      g.addColorStop(0, `rgba(255,255,255,${.14 + c.eyeBrilliance * .20})`); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, f.width * .095, f.height * .045, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

function ellipse(ctx: CanvasRenderingContext2D, p: Point, rx: number, ry: number, fill: string) { ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }

function localScale(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, scale: number) {
  if (Math.abs(scale - 1) < .002) return;
  const padX = rx * 1.5, padY = ry * 1.5, sx = Math.max(0, Math.floor(cx - padX)), sy = Math.max(0, Math.floor(cy - padY));
  const sw = Math.min(ctx.canvas.width - sx, Math.ceil(padX * 2)), sh = Math.min(ctx.canvas.height - sy, Math.ceil(padY * 2)); if (sw < 12 || sh < 12) return;
  const crop = document.createElement("canvas"); crop.width = sw; crop.height = sh; const c = crop.getContext("2d"); if (!c) return;
  c.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy); ctx.drawImage(crop, sx, sy, sw, sh); ctx.restore();
}

function sculpt(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, c: Required<BeautyConfig>) {
  const f = getFaceGeometry(l, w, h);
  if (c.enlargeEyes > 0) for (const ids of [LM.leftEye, LM.rightEye]) {
    const p = getPoints(l, ids, w, h); if (p.length < 3) continue;
    const cx = p.reduce((s, q) => s + q.x, 0) / p.length, cy = p.reduce((s, q) => s + q.y, 0) / p.length;
    localScale(ctx, cx, cy, Math.max(24, f.width * .075), Math.max(18, f.height * .055), 1 + c.enlargeEyes * .18);
  }
  if (c.enlargeLips > 0) {
    const p = getPoints(l, LM.outerLips, w, h); if (p.length >= 3) { const cx = p.reduce((s, q) => s + q.x, 0) / p.length, cy = p.reduce((s, q) => s + q.y, 0) / p.length; localScale(ctx, cx, cy, Math.max(32, f.width * .21), Math.max(24, f.height * .13), 1 + c.enlargeLips * .14); }
  }
  if (c.slimFace > 0) localScale(ctx, f.cx, f.cy, f.width * .48, f.height * .43, 1 - c.slimFace * .055);
}

export function applyBeautyPipeline(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, config?: BeautyConfig) {
  if (!landmarks?.length) return;
  const c = normalizeBeautyConfig(config), skinAmount = Math.max(c.smoothSkin, c.skinTexture);
  retouchSkin(ctx, landmarks, width, height, skinAmount);
  tone(ctx, landmarks, width, height, c.brightenSkin);
  eyePolish(ctx, landmarks, width, height, c);
  sculpt(ctx, landmarks, width, height, c);
}
