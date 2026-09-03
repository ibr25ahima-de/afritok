import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM, getFaceGeometry, getPoints } from "@/components/faceUtils";

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

/**
 * Reduces the visual contrast of tiny dark skin irregularities (spots,
 * blackheads and small marks) without applying a full-face blur.
 *
 * The correction is driven by the difference between the camera pixel and a
 * small local average. Broad edges are therefore left mostly untouched while
 * isolated dark pixels are gently brought toward their surrounding skin tone.
 */
export function applyBlemishReduction(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number,
) {
  amount = clamp01(amount);
  if (amount <= 0) return;

  const face = getFaceGeometry(landmarks, width, height);
  if (face.width < 30 || face.height < 30) return;

  const scale = Math.min(1, 560 / Math.max(width, height));
  const rw = Math.max(1, Math.round(width * scale));
  const rh = Math.max(1, Math.round(height * scale));

  const source = document.createElement("canvas");
  const local = document.createElement("canvas");
  source.width = local.width = rw;
  source.height = local.height = rh;

  const s = source.getContext("2d", { willReadFrequently: true });
  const b = local.getContext("2d");
  if (!s || !b) return;

  s.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, rw, rh);
  b.filter = `blur(${(1.8 + amount * 1.4).toFixed(1)}px)`;
  b.drawImage(source, 0, 0);
  b.filter = "none";

  const original = s.getImageData(0, 0, rw, rh);
  const average = b.getImageData(0, 0, rw, rh);
  const out = s.createImageData(rw, rh);

  // Work on luminance, but preserve the original chroma. This keeps skin
  // colour natural instead of painting the face grey or white.
  for (let i = 0; i < original.data.length; i += 4) {
    const r = original.data[i];
    const g = original.data[i + 1];
    const bl = original.data[i + 2];
    const ar = average.data[i];
    const ag = average.data[i + 1];
    const ab = average.data[i + 2];

    const y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    const ay = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab;
    const darkGap = ay - y;

    // Only lift isolated dark deviations. Stronger structure/edges have a
    // larger neighbourhood difference and are intentionally protected.
    const isolated = Math.max(0, Math.min(1, (darkGap - 5) / 34));
    const correction = isolated * (0.20 + amount * 0.38);

    out.data[i] = Math.round(r + (ar - r) * correction);
    out.data[i + 1] = Math.round(g + (ag - g) * correction);
    out.data[i + 2] = Math.round(bl + (ab - bl) * correction);
    out.data[i + 3] = 255;
  }

  const corrected = document.createElement("canvas");
  corrected.width = rw;
  corrected.height = rh;
  const cc = corrected.getContext("2d");
  if (!cc) return;
  cc.putImageData(out, 0, 0);

  const oval = getPoints(landmarks, LM.faceOval, width, height);
  if (oval.length < 3) return;

  ctx.save();
  polygon(ctx, oval);
  protectedRegions(ctx, landmarks, width, height);
  try {
    ctx.clip("evenodd");
  } catch {
    ctx.clip();
  }

  // Keep this pass subtle. The goal is to make marks disappear into the skin,
  // not to erase natural texture.
  ctx.globalAlpha = 0.42 + amount * 0.28;
  ctx.drawImage(corrected, 0, 0, rw, rh, 0, 0, width, height);
  ctx.restore();
}
