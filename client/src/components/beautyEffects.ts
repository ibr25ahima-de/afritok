import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, Point, center, getFaceGeometry, getPoints } from "./faceUtils";

export interface BeautyConfig {
  smoothSkin?: number;
  brightenSkin?: number;
  enlargeEyes?: number;
  slimFace?: number;
  whitenTeeth?: number;
  enlargeLips?: number;
  symmetry?: number;
}

function clamp01(value: number) { return Math.max(0, Math.min(1, value)); }

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 3) return false;
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.closePath();
  return true;
}

/** Fast mobile beauty pass: no full-frame pixel loops. */
export function applySkinBeauty(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (!landmarks?.length || amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  const facePoints = getPoints(landmarks, LM.faceOval, width, height);
  if (facePoints.length < 3 || face.width < 20 || face.height < 20) return;

  // Copy the current frame once into a small temporary canvas. This avoids
  // the very expensive getImageData/per-pixel work that was blocking phones.
  const maxSize = 640;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const source = document.createElement("canvas");
  source.width = sw;
  source.height = sh;
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) return;
  sourceCtx.drawImage(ctx.canvas, 0, 0, sw, sh);

  ctx.save();
  polygon(ctx, facePoints);
  const holes = [getPoints(landmarks, LM.leftEye, width, height), getPoints(landmarks, LM.rightEye, width, height), getPoints(landmarks, LM.outerLips, width, height)];
  for (const hole of holes) {
    if (hole.length < 3) continue;
    ctx.moveTo(hole[0].x, hole[0].y);
    for (let i = 1; i < hole.length; i++) ctx.lineTo(hole[i].x, hole[i].y);
    ctx.closePath();
  }
  try { ctx.clip("evenodd"); } catch { ctx.clip(); }
  ctx.globalAlpha = 0.48 + 0.28 * clamp01(amount);
  ctx.filter = `blur(${(4 + 5 * clamp01(amount)).toFixed(1)}px)`;
  ctx.drawImage(source, 0, 0, sw, sh, 0, 0, width, height);
  ctx.filter = "none";
  ctx.restore();
}

function applyBrightenSkin(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (!landmarks?.length || amount <= 0) return;
  const points = getPoints(landmarks, LM.faceOval, width, height);
  if (points.length < 3) return;
  const face = getFaceGeometry(landmarks, width, height);
  ctx.save();
  polygon(ctx, points);
  ctx.clip();
  ctx.globalAlpha = Math.min(0.22, amount * 0.22);
  ctx.fillStyle = "white";
  ctx.fillRect(face.left, face.top, face.width, face.height);
  ctx.restore();
}

/** Local face transformation using one temporary snapshot. */
function applyLocalScale(ctx: CanvasRenderingContext2D, centerPoint: Point, radiusX: number, radiusY: number, scale: number) {
  if (scale <= 1) return;
  const canvas = document.createElement("canvas");
  canvas.width = ctx.canvas.width;
  canvas.height = ctx.canvas.height;
  const copy = canvas.getContext("2d");
  if (!copy) return;
  copy.drawImage(ctx.canvas, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerPoint.x, centerPoint.y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(centerPoint.x, centerPoint.y);
  ctx.scale(scale, scale);
  ctx.translate(-centerPoint.x, -centerPoint.y);
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}

function applyEnlargeEyes(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const strength = Math.min(0.22, amount * 0.22);
  for (const indices of [LM.leftEye, LM.rightEye]) {
    const points = getPoints(landmarks, indices, width, height);
    if (points.length < 3) continue;
    const c = center(points);
    applyLocalScale(ctx, c, Math.max(22, width * 0.045), Math.max(18, height * 0.045), 1 + strength);
  }
}

function applySlimFace(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  if (face.width < 20) return;
  // Horizontal expansion inside the face region makes the jaw/cheeks appear slimmer.
  applyLocalScale(ctx, { x: face.cx, y: face.cy }, face.width * 0.48, face.height * 0.46, 1 + Math.min(0.10, amount * 0.10));
}

function applyWhitenTeeth(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const points = getPoints(landmarks, LM.innerLips, width, height);
  if (points.length < 3) return;
  const c = center(points);
  const face = getFaceGeometry(landmarks, width, height);
  ctx.save();
  polygon(ctx, points);
  ctx.clip();
  ctx.globalAlpha = Math.min(0.30, amount * 0.30);
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, face.width * 0.10, face.height * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function applyEnlargeLips(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const points = getPoints(landmarks, LM.outerLips, width, height);
  if (points.length < 3) return;
  const c = center(points);
  const face = getFaceGeometry(landmarks, width, height);
  applyLocalScale(ctx, c, Math.max(28, face.width * 0.18), Math.max(22, face.height * 0.11), 1 + Math.min(0.20, amount * 0.20));
}

function applySymmetry(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const points = getPoints(landmarks, LM.faceOval, width, height);
  if (points.length < 3) return;
  const face = getFaceGeometry(landmarks, width, height);
  ctx.save();
  polygon(ctx, points);
  ctx.clip();
  ctx.globalAlpha = Math.min(0.10, amount * 0.10);
  ctx.fillStyle = "white";
  ctx.fillRect(face.left, face.top, face.width, face.height);
  ctx.restore();
}

export function applyBeautyEffects(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, config: BeautyConfig) {
  if (!landmarks?.length) return;
  applySkinBeauty(ctx, landmarks, width, height, config.smoothSkin ?? 0);
  applyBrightenSkin(ctx, landmarks, width, height, config.brightenSkin ?? 0);
  applyEnlargeEyes(ctx, landmarks, width, height, config.enlargeEyes ?? 0);
  applySlimFace(ctx, landmarks, width, height, config.slimFace ?? 0);
  applyWhitenTeeth(ctx, landmarks, width, height, config.whitenTeeth ?? 0);
  applyEnlargeLips(ctx, landmarks, width, height, config.enlargeLips ?? 0);
  applySymmetry(ctx, landmarks, width, height, config.symmetry ?? 0);
}
