import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export const LM = {
  faceOval: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ],

  leftEye: [
    33, 7, 163, 144, 145, 153, 154, 155,
    133, 173, 157, 158, 159, 160, 161, 246,
  ],

  rightEye: [
    263, 249, 390, 373, 374, 380, 381, 382,
    362, 398, 384, 385, 386, 387, 388, 466,
  ],

  outerLips: [
    61, 185, 40, 39, 37, 0, 267, 269, 270,
    409, 291, 375, 321, 405, 314, 17, 84,
    181, 91, 146,
  ],

  innerLips: [
    78, 95, 88, 178, 87, 14, 317, 402, 318,
    324, 308, 415, 310, 311, 312, 13, 82,
    81, 42, 183,
  ],

  nose: [
    1, 2, 98, 327, 6, 197, 195, 5, 4,
  ],

  leftJaw: [
    234, 127, 162, 21, 54, 103, 67, 109,
  ],

  rightJaw: [
    454, 323, 361, 288, 397, 365, 379, 378,
    400, 377, 152,
  ],
};

export interface Point {
  x: number;
  y: number;
}

export interface FaceGeometry {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export function getPoints(
  landmarks: NormalizedLandmark[],
  indices: number[],
  width: number,
  height: number
): Point[] {
  return indices
    .filter((i) => landmarks[i])
    .map((i) => ({
      x: landmarks[i].x * width,
      y: landmarks[i].y * height,
    }));
}

export function center(points: Point[]): Point {
  if (!points.length) {
    return { x: 0, y: 0 };
  }

  let x = 0;
  let y = 0;

  for (const point of points) {
    x += point.x;
    y += point.y;
  }

  return {
    x: x / points.length,
    y: y / points.length,
  };
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function getFaceGeometry(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number
): FaceGeometry {
  const points = getPoints(
    landmarks,
    LM.faceOval,
    width,
    height
  );

  if (!points.length) {
    return {
      left: 0,
      right: width,
      top: 0,
      bottom: height,
      cx: width / 2,
      cy: height / 2,
      width,
      height,
    };
  }

  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;

  for (const point of points) {
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }

  return {
    left,
    right,
    top,
    bottom,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    width: right - left,
    height: bottom - top,
  };
}

export function buildPolygonMask(
  points: Point[],
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);

  if (points.length < 3) {
    return mask;
  }

  let minY = height;
  let maxY = 0;

  for (const point of points) {
    minY = Math.max(0, Math.floor(Math.min(minY, point.y)));
    maxY = Math.min(height - 1, Math.ceil(Math.max(maxY, point.y)));
  }

  for (let y = minY; y <= maxY; y++) {
    const intersections: number[] = [];

    for (
      let i = 0, j = points.length - 1;
      i < points.length;
      j = i++
    ) {
      const a = points[i];
      const b = points[j];

      if ((a.y > y) !== (b.y > y)) {
        const x =
          b.x +
          ((y - b.y) * (a.x - b.x)) /
            (a.y - b.y);

        intersections.push(x);
      }
    }

    intersections.sort((a, b) => a - b);

    for (let i = 0; i < intersections.length - 1; i += 2) {
      const start = Math.max(
        0,
        Math.floor(intersections[i])
      );

      const end = Math.min(
        width - 1,
        Math.ceil(intersections[i + 1])
      );

      for (let x = start; x <= end; x++) {
        mask[y * width + x] = 1;
      }
    }
  }

  return mask;
}

export function smoothLandmarks(
  current: NormalizedLandmark[],
  previous: NormalizedLandmark[] | null,
  alpha = 0.7
): NormalizedLandmark[] {
  if (!previous || previous.length !== current.length) {
    return current.map((p) => ({ ...p }));
  }

  return current.map((point, index) => {
    const old = previous[index];

    return {
      x: point.x * alpha + old.x * (1 - alpha),
      y: point.y * alpha + old.y * (1 - alpha),
      z:
        (point.z ?? 0) * alpha +
        (old.z ?? 0) * (1 - alpha),
    };
  });
}