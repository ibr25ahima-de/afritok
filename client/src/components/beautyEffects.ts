import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, Point, center, distance, getFaceGeometry, getPoints, buildPolygonMask } from "./faceUtils";

export interface BeautyConfig {
  smoothSkin?: number;
  brightenSkin?: number;
  enlargeEyes?: number;
  slimFace?: number;
  whitenTeeth?: number;
  enlargeLips?: number;
  symmetry?: number;
}

function clamp(value: number): number { return Math.max(0, Math.min(255, value)); }

function applySmoothSkin(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  const facePoints = getPoints(landmarks, LM.faceOval, width, height);
  if (facePoints.length < 3) return;

  const padding = Math.max(4, Math.round(Math.min(face.width, face.height) * 0.02));
  const left = Math.max(0, Math.floor(face.left - padding));
  const right = Math.min(width - 1, Math.ceil(face.right + padding));
  const top = Math.max(0, Math.floor(face.top - padding));
  const bottom = Math.min(height - 1, Math.ceil(face.bottom + padding));
  const image = ctx.getImageData(left, top, Math.max(1, right - left + 1), Math.max(1, bottom - top + 1));
  const result = new Uint8ClampedArray(image.data);

  // Stronger range than before so the selected beauty preset is visibly different.
  // The blend remains below 50% to preserve natural facial detail.
  const strength = Math.min(0.48, amount * 0.48);
  const w = image.width;
  const h = image.height;
  const mask = buildPolygonMask(facePoints, width, height);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = left + x;
      const gy = top + y;
      if (!mask[gy * width + gx]) continue;
      const p = (y * w + x) * 4;
      const lp = p - 4, rp = p + 4, tp = p - w * 4, bp = p + w * 4;
      const avgR = (image.data[lp] + image.data[rp] + image.data[tp] + image.data[bp]) / 4;
      const avgG = (image.data[lp + 1] + image.data[rp + 1] + image.data[tp + 1] + image.data[bp + 1]) / 4;
      const avgB = (image.data[lp + 2] + image.data[rp + 2] + image.data[tp + 2] + image.data[bp + 2]) / 4;
      result[p] = image.data[p] * (1 - strength) + avgR * strength;
      result[p + 1] = image.data[p + 1] * (1 - strength) + avgG * strength;
      result[p + 2] = image.data[p + 2] * (1 - strength) + avgB * strength;
    }
  }
  ctx.putImageData(new ImageData(result, w, h), left, top);
}

function applyBrightenSkin(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  const points = getPoints(landmarks, LM.faceOval, width, height);
  if (points.length < 3) return;
  const mask = buildPolygonMask(points, width, height);
  const left = Math.max(0, Math.floor(face.left));
  const right = Math.min(width - 1, Math.ceil(face.right));
  const top = Math.max(0, Math.floor(face.top));
  const bottom = Math.min(height - 1, Math.ceil(face.bottom));
  const image = ctx.getImageData(left, top, Math.max(1, right - left + 1), Math.max(1, bottom - top + 1));
  const strength = Math.min(0.34, amount * 0.34);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const gx = left + x, gy = top + y;
      if (!mask[gy * width + gx]) continue;
      const p = (y * image.width + x) * 4;
      image.data[p] = clamp(image.data[p] + (255 - image.data[p]) * strength);
      image.data[p + 1] = clamp(image.data[p + 1] + (255 - image.data[p + 1]) * strength);
      image.data[p + 2] = clamp(image.data[p + 2] + (255 - image.data[p + 2]) * strength);
    }
  }
  ctx.putImageData(image, left, top);
}

function sampleWarp(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, transform: (x: number, y: number) => { x: number; y: number }) {
  if (width <= 0 || height <= 0) return;
  const image = ctx.getImageData(left, top, width, height);
  const result = new Uint8ClampedArray(image.data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = transform(x, y);
      const sx = Math.round(s.x), sy = Math.round(s.y);
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
      const source = (sy * width + sx) * 4, target = (y * width + x) * 4;
      result[target] = image.data[source];
      result[target + 1] = image.data[source + 1];
      result[target + 2] = image.data[source + 2];
      result[target + 3] = image.data[source + 3];
    }
  }
  ctx.putImageData(new ImageData(result, width, height), left, top);
}

function applyEnlargeEye(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, indices: number[], amount: number) {
  const points = getPoints(landmarks, indices, width, height);
  if (points.length < 3 || amount <= 0) return;
  const c = center(points), face = getFaceGeometry(landmarks, width, height);
  const radius = Math.max(24, Math.min(face.width, face.height) * 0.12);
  const left = Math.max(0, Math.floor(c.x - radius)), top = Math.max(0, Math.floor(c.y - radius));
  const right = Math.min(width, Math.ceil(c.x + radius)), bottom = Math.min(height, Math.ceil(c.y + radius));
  const strength = Math.min(0.28, amount * 0.28);
  sampleWarp(ctx, left, top, right - left, bottom - top, (x, y) => {
    const gx = left + x, gy = top + y, dx = gx - c.x, dy = gy - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= radius) return { x, y };
    const falloff = 1 - d / radius;
    const scale = 1 - strength * falloff;
    return { x: (c.x + dx * scale) - left, y: (c.y + dy * scale) - top };
  });
}

function applyEnlargeEyes(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  applyEnlargeEye(ctx, landmarks, width, height, LM.leftEye, Math.min(1, amount));
  applyEnlargeEye(ctx, landmarks, width, height, LM.rightEye, Math.min(1, amount));
}

function applySlimFace(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  const radiusX = face.width * 0.52, radiusY = face.height * 0.52;
  const left = Math.max(0, Math.floor(face.cx - radiusX)), top = Math.max(0, Math.floor(face.cy - radiusY));
  const right = Math.min(width, Math.ceil(face.cx + radiusX)), bottom = Math.min(height, Math.ceil(face.cy + radiusY));
  const strength = Math.min(0.20, amount * 0.20);
  sampleWarp(ctx, left, top, right - left, bottom - top, (x, y) => {
    const gx = left + x, gy = top + y, dx = gx - face.cx;
    const vertical = Math.max(0, 1 - Math.abs((gy - face.cy) / radiusY));
    const nx = Math.abs(dx) / radiusX;
    if (nx >= 1) return { x, y };
    const warp = strength * vertical * nx * nx;
    return { x: (face.cx + dx * (1 + warp)) - left, y };
  });
}

function applyWhitenTeeth(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const inner = getPoints(landmarks, LM.innerLips, width, height);
  if (inner.length < 3) return;
  const mask = buildPolygonMask(inner, width, height);
  const face = getFaceGeometry(landmarks, width, height);
  const left = Math.max(0, Math.floor(face.left)), right = Math.min(width - 1, Math.ceil(face.right));
  const top = Math.max(0, Math.floor(face.top)), bottom = Math.min(height - 1, Math.ceil(face.bottom));
  const image = ctx.getImageData(left, top, Math.max(1, right - left + 1), Math.max(1, bottom - top + 1));
  const strength = Math.min(0.22, amount * 0.22);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const gx = left + x, gy = top + y;
    if (!mask[gy * width + gx]) continue;
    const p = (y * image.width + x) * 4;
    image.data[p] = clamp(image.data[p] + (255 - image.data[p]) * strength);
    image.data[p + 1] = clamp(image.data[p + 1] + (255 - image.data[p + 1]) * strength);
    image.data[p + 2] = clamp(image.data[p + 2] + (255 - image.data[p + 2]) * strength);
  }
  ctx.putImageData(image, left, top);
}

function applyEnlargeLips(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const points = getPoints(landmarks, LM.outerLips, width, height);
  if (points.length < 3) return;
  const c = center(points), face = getFaceGeometry(landmarks, width, height);
  const radius = Math.max(25, Math.min(face.width, face.height) * 0.20);
  const left = Math.max(0, Math.floor(c.x - radius)), top = Math.max(0, Math.floor(c.y - radius));
  const right = Math.min(width, Math.ceil(c.x + radius)), bottom = Math.min(height, Math.ceil(c.y + radius));
  const strength = Math.min(0.22, amount * 0.22);
  sampleWarp(ctx, left, top, right - left, bottom - top, (x, y) => {
    const gx = left + x, gy = top + y, dx = gx - c.x, dy = gy - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= radius) return { x, y };
    const scale = 1 - strength * (1 - d / radius);
    return { x: (c.x + dx * scale) - left, y: (c.y + dy * scale) - top };
  });
}

function applySymmetry(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const face = getFaceGeometry(landmarks, width, height);
  const left = Math.max(0, Math.floor(face.left)), right = Math.min(width - 1, Math.ceil(face.right));
  const top = Math.max(0, Math.floor(face.top)), bottom = Math.min(height - 1, Math.ceil(face.bottom));
  const image = ctx.getImageData(left, top, Math.max(1, right - left + 1), Math.max(1, bottom - top + 1));
  const result = new Uint8ClampedArray(image.data);
  const strength = Math.min(0.18, amount * 0.18);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const gx = left + x;
    if (gx >= face.cx) continue;
    const mirroredX = Math.round(face.cx + (face.cx - gx));
    if (mirroredX < left || mirroredX >= left + image.width) continue;
    const source = (y * image.width + mirroredX - left) * 4, target = (y * image.width + x) * 4;
    result[target] = image.data[target] * (1 - strength) + image.data[source] * strength;
    result[target + 1] = image.data[target + 1] * (1 - strength) + image.data[source + 1] * strength;
    result[target + 2] = image.data[target + 2] * (1 - strength) + image.data[source + 2] * strength;
  }
  ctx.putImageData(new ImageData(result, image.width, image.height), left, top);
}

export function applyBeautyEffects(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, config: BeautyConfig) {
  if (!landmarks?.length) return;
  if ((config.smoothSkin ?? 0) > 0) applySmoothSkin(ctx, landmarks, width, height, config.smoothSkin ?? 0);
  if ((config.brightenSkin ?? 0) > 0) applyBrightenSkin(ctx, landmarks, width, height, config.brightenSkin ?? 0);
  if ((config.enlargeEyes ?? 0) > 0) applyEnlargeEyes(ctx, landmarks, width, height, config.enlargeEyes ?? 0);
  if ((config.slimFace ?? 0) > 0) applySlimFace(ctx, landmarks, width, height, config.slimFace ?? 0);
  if ((config.whitenTeeth ?? 0) > 0) applyWhitenTeeth(ctx, landmarks, width, height, config.whitenTeeth ?? 0);
  if ((config.enlargeLips ?? 0) > 0) applyEnlargeLips(ctx, landmarks, width, height, config.enlargeLips ?? 0);
  if ((config.symmetry ?? 0) > 0) applySymmetry(ctx, landmarks, width, height, config.symmetry ?? 0);
}
