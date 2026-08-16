import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  LM,
  Point,
  center,
  distance,
  getFaceGeometry,
  getPoints,
  buildPolygonMask,
} from "./faceUtils";

export interface BeautyConfig {
  smoothSkin?: number;
  brightenSkin?: number;
  enlargeEyes?: number;
  slimFace?: number;
  whitenTeeth?: number;
  enlargeLips?: number;
  symmetry?: number;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function blurImage(
  source: ImageData,
  radius: number
): ImageData {
  const { width, height, data } = source;

  const output = new Uint8ClampedArray(data.length);
  const r = Math.max(1, Math.floor(radius));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rs = 0;
      let gs = 0;
      let bs = 0;
      let count = 0;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = Math.max(
            0,
            Math.min(width - 1, x + dx)
          );

          const yy = Math.max(
            0,
            Math.min(height - 1, y + dy)
          );

          const index = (yy * width + xx) * 4;

          rs += data[index];
          gs += data[index + 1];
          bs += data[index + 2];

          count++;
        }
      }

      const index = (y * width + x) * 4;

      output[index] = rs / count;
      output[index + 1] = gs / count;
      output[index + 2] = bs / count;
      output[index + 3] = data[index + 3];
    }
  }

  return new ImageData(
    output,
    width,
    height
  );
}

function applySmoothSkin(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const image = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const facePoints = getPoints(
    landmarks,
    LM.faceOval,
    width,
    height
  );

  const faceMask = buildPolygonMask(
    facePoints,
    width,
    height
  );

  const eye1 = buildPolygonMask(
    getPoints(
      landmarks,
      LM.leftEye,
      width,
      height
    ),
    width,
    height
  );

  const eye2 = buildPolygonMask(
    getPoints(
      landmarks,
      LM.rightEye,
      width,
      height
    ),
    width,
    height
  );

  const lips = buildPolygonMask(
    getPoints(
      landmarks,
      [...LM.outerLips, ...LM.innerLips],
      width,
      height
    ),
    width,
    height
  );

  const nose = buildPolygonMask(
    getPoints(
      landmarks,
      LM.nose,
      width,
      height
    ),
    width,
    height
  );

  const radius = Math.max(
    1,
    Math.round(1 + amount * 5)
  );

  const blurred = blurImage(
    image,
    radius
  );

  const result = new Uint8ClampedArray(
    image.data
  );

  for (let i = 0; i < width * height; i++) {
    if (
      faceMask[i] === 0 ||
      eye1[i] ||
      eye2[i] ||
      lips[i] ||
      nose[i]
    ) {
      continue;
    }

    const p = i * 4;

    const strength =
      amount * 0.72;

    result[p] =
      image.data[p] * (1 - strength) +
      blurred.data[p] * strength;

    result[p + 1] =
      image.data[p + 1] * (1 - strength) +
      blurred.data[p + 1] * strength;

    result[p + 2] =
      image.data[p + 2] * (1 - strength) +
      blurred.data[p + 2] * strength;
  }

  ctx.putImageData(
    new ImageData(
      result,
      width,
      height
    ),
    0,
    0
  );
}

function applyBrightenSkin(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const image = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const face = getFaceGeometry(
    landmarks,
    width,
    height
  );

  const mask = buildPolygonMask(
    getPoints(
      landmarks,
      LM.faceOval,
      width,
      height
    ),
    width,
    height
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;

      if (!mask[index]) continue;

      const dx = x - face.cx;
      const dy = y - face.cy;

      const distanceFromCenter =
        Math.sqrt(dx * dx + dy * dy);

      const maxDistance =
        Math.max(face.width, face.height) *
        0.65;

      const radial =
        Math.max(
          0,
          1 - distanceFromCenter / maxDistance
        );

      const strength =
        amount * radial * 0.14;

      const p = index * 4;

      image.data[p] = clamp(
        image.data[p] +
          255 * strength
      );

      image.data[p + 1] = clamp(
        image.data[p + 1] +
          255 * strength * 0.95
      );

      image.data[p + 2] = clamp(
        image.data[p + 2] +
          255 * strength * 0.9
      );
    }
  }

  ctx.putImageData(
    image,
    0,
    0
  );
}

function warpEye(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  indices: number[],
  amount: number
) {
  const points = getPoints(
    landmarks,
    indices,
    width,
    height
  );

  if (!points.length) return;

  const c = center(points);

  const eyeWidth =
    Math.max(
      12,
      distance(
        points[0],
        points[8]
      )
    );

  const radius =
    eyeWidth * 2.6;

  const image = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const minX = Math.max(
    0,
    Math.floor(c.x - radius)
  );

  const maxX = Math.min(
    width - 1,
    Math.ceil(c.x + radius)
  );

  const minY = Math.max(
    0,
    Math.floor(c.y - radius)
  );

  const maxY = Math.min(
    height - 1,
    Math.ceil(c.y + radius)
  );

  const strength =
    amount * 0.32;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - c.x;
      const dy = y - c.y;

      const d =
        Math.sqrt(dx * dx + dy * dy);

      if (d >= radius) continue;

      const falloff =
        1 - d / radius;

      const zoom =
        1 - strength * falloff;

      const sx =
        c.x + dx * zoom;

      const sy =
        c.y + dy * zoom;

      const srcX = Math.round(sx);
      const srcY = Math.round(sy);

      if (
        srcX < 0 ||
        srcX >= width ||
        srcY < 0 ||
        srcY >= height
      ) {
        continue;
      }

      const source =
        (srcY * width + srcX) * 4;

      const target =
        (y * width + x) * 4;

      result[target] =
        image.data[source];

      result[target + 1] =
        image.data[source + 1];

      result[target + 2] =
        image.data[source + 2];

      result[target + 3] =
        image.data[source + 3];
    }
  }

  ctx.putImageData(
    new ImageData(
      result,
      width,
      height
    ),
    0,
    0
  );
}

function applyEnlargeEyes(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  warpEye(
    ctx,
    landmarks,
    width,
    height,
    LM.leftEye,
    amount
  );

  warpEye(
    ctx,
    landmarks,
    width,
    height,
    LM.rightEye,
    amount
  );
}

function applySlimFace(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const face =
    getFaceGeometry(
      landmarks,
      width,
      height
    );

  const image =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const strength =
    amount * 0.16;

  const startY =
    Math.max(0, Math.floor(
      face.top
    ));

  const endY =
    Math.min(
      height - 1,
      Math.ceil(face.bottom)
    );

  for (
    let y = startY;
    y <= endY;
    y++
  ) {
    const normalized =
      (y - startY) /
      Math.max(
        1,
        endY - startY
      );

    const vertical =
      Math.sin(
        normalized * Math.PI
      );

    for (
      let x = Math.floor(face.left);
      x <= Math.ceil(face.right);
      x++
    ) {
      const dx =
        x - face.cx;

      const abs =
        Math.abs(dx);

      const halfWidth =
        face.width / 2;

      if (abs > halfWidth) {
        continue;
      }

      const edge =
        abs / halfWidth;

      const warp =
        strength *
        vertical *
        edge;

      const sourceX =
        face.cx +
        dx *
        (1 + warp);

      const sx =
        Math.max(
          0,
          Math.min(
            width - 1,
            Math.round(sourceX)
          )
        );

      const source =
        (y * width + sx) * 4;

      const target =
        (y * width + x) * 4;

      result[target] =
        image.data[source];

      result[target + 1] =
        image.data[source + 1];

      result[target + 2] =
        image.data[source + 2];

      result[target + 3] =
        image.data[source + 3];
    }
  }

  ctx.putImageData(
    new ImageData(
      result,
      width,
      height
    ),
    0,
    0
  );
}

function applyWhitenTeeth(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const outer =
    getPoints(
      landmarks,
      LM.outerLips,
      width,
      height
    );

  const inner =
    getPoints(
      landmarks,
      LM.innerLips,
      width,
      height
    );

  if (!outer.length || !inner.length) {
    return;
  }

  const mask =
    buildPolygonMask(
      inner,
      width,
      height
    );

  const image =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  for (
    let i = 0;
    i < width * height;
    i++
  ) {
    if (!mask[i]) continue;

    const p = i * 4;

    const strength =
      amount * 0.32;

    image.data[p] =
      clamp(
        image.data[p] +
          (255 - image.data[p]) *
            strength
      );

    image.data[p + 1] =
      clamp(
        image.data[p + 1] +
          (255 - image.data[p + 1]) *
            strength
      );

    image.data[p + 2] =
      clamp(
        image.data[p + 2] +
          (255 - image.data[p + 2]) *
            strength
      );
  }

  ctx.putImageData(
    image,
    0,
    0
  );
}

function applyEnlargeLips(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const points =
    getPoints(
      landmarks,
      LM.outerLips,
      width,
      height
    );

  if (!points.length) return;

  const c =
    center(points);

  const scale =
    1 + amount * 0.18;

  const image =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const bounds =
    getFaceGeometry(
      landmarks,
      width,
      height
    );

  const radius =
    Math.min(
      bounds.width,
      bounds.height
    ) * 0.22;

  const minX =
    Math.max(
      0,
      Math.floor(c.x - radius)
    );

  const maxX =
    Math.min(
      width - 1,
      Math.ceil(c.x + radius)
    );

  const minY =
    Math.max(
      0,
      Math.floor(c.y - radius)
    );

  const maxY =
    Math.min(
      height - 1,
      Math.ceil(c.y + radius)
    );

  for (
    let y = minY;
    y <= maxY;
    y++
  ) {
    for (
      let x = minX;
      x <= maxX;
      x++
    ) {
      const dx = x - c.x;
      const dy = y - c.y;

      const d =
        Math.sqrt(dx * dx + dy * dy);

      if (d > radius) continue;

      const falloff =
        1 - d / radius;

      const localScale =
        1 +
        (scale - 1) *
          falloff;

      const sx =
        c.x +
        dx / localScale;

      const sy =
        c.y +
        dy / localScale;

      const sourceX =
        Math.round(sx);

      const sourceY =
        Math.round(sy);

      if (
        sourceX < 0 ||
        sourceX >= width ||
        sourceY < 0 ||
        sourceY >= height
      ) {
        continue;
      }

      const source =
        (sourceY * width + sourceX) * 4;

      const target =
        (y * width + x) * 4;

      result[target] =
        image.data[source];

      result[target + 1] =
        image.data[source + 1];

      result[target + 2] =
        image.data[source + 2];

      result[target + 3] =
        image.data[source + 3];
    }
  }

  ctx.putImageData(
    new ImageData(
      result,
      width,
      height
    ),
    0,
    0
  );
}

function applySymmetry(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const face =
    getFaceGeometry(
      landmarks,
      width,
      height
    );

  const image =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const centerX =
    Math.round(face.cx);

  for (
    let y = Math.floor(face.top);
    y <= Math.ceil(face.bottom);
    y++
  ) {
    for (
      let x = Math.floor(face.left);
      x < centerX;
      x++
    ) {
      const mirroredX =
        centerX +
        (centerX - x);

      if (
        mirroredX < 0 ||
        mirroredX >= width
      ) {
        continue;
      }

      const source =
        (y * width + mirroredX) * 4;

      const target =
        (y * width + x) * 4;

      const strength =
        amount * 0.38;

      result[target] =
        image.data[target] *
          (1 - strength) +
        image.data[source] *
          strength;

      result[target + 1] =
        image.data[target + 1] *
          (1 - strength) +
        image.data[source + 1] *
          strength;

      result[target + 2] =
        image.data[target + 2] *
          (1 - strength) +
        image.data[source + 2] *
          strength;
    }
  }

  ctx.putImageData(
    new ImageData(
      result,
      width,
      height
    ),
    0,
    0
  );
}

export function applyBeautyEffects(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  config: BeautyConfig
) {
  if (!landmarks.length) return;

  applySmoothSkin(
    ctx,
    landmarks,
    width,
    height,
    config.smoothSkin ?? 0
  );

  applyBrightenSkin(
    ctx,
    landmarks,
    width,
    height,
    config.brightenSkin ?? 0
  );

  applyEnlargeEyes(
    ctx,
    landmarks,
    width,
    height,
    config.enlargeEyes ?? 0
  );

  applySlimFace(
    ctx,
    landmarks,
    width,
    height,
    config.slimFace ?? 0
  );

  applyWhitenTeeth(
    ctx,
    landmarks,
    width,
    height,
    config.whitenTeeth ?? 0
  );

  applyEnlargeLips(
    ctx,
    landmarks,
    width,
    height,
    config.enlargeLips ?? 0
  );

  applySymmetry(
    ctx,
    landmarks,
    width,
    height,
    config.symmetry ?? 0
  );
}