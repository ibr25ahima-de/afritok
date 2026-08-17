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

/**
 * =========================================================
 * LISSAGE DE PEAU
 * =========================================================
 *
 * Traitement volontairement léger.
 *
 * On évite le gros flou carré qui rendait la caméra
 * extrêmement lourde.
 */
function applySmoothSkin(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const face = getFaceGeometry(
    landmarks,
    width,
    height
  );

  const facePoints = getPoints(
    landmarks,
    LM.faceOval,
    width,
    height
  );

  if (facePoints.length < 3) return;

  const mask = buildPolygonMask(
    facePoints,
    width,
    height
  );

  /**
   * Zone limitée au visage.
   */
  const left = Math.max(
    0,
    Math.floor(face.left)
  );

  const right = Math.min(
    width - 1,
    Math.ceil(face.right)
  );

  const top = Math.max(
    0,
    Math.floor(face.top)
  );

  const bottom = Math.min(
    height - 1,
    Math.ceil(face.bottom)
  );

  /**
   * Un seul getImageData.
   */
  const image = ctx.getImageData(
    left,
    top,
    Math.max(1, right - left + 1),
    Math.max(1, bottom - top + 1)
  );

  const localWidth =
    image.width;

  const localHeight =
    image.height;

  /**
   * Lissage très léger.
   *
   * On mélange simplement avec les pixels voisins.
   * Pas de gros blur coûteux.
   */
  const result =
    new Uint8ClampedArray(
      image.data
    );

  const strength =
    Math.min(0.22, amount * 0.16);

  for (
    let y = 1;
    y < localHeight - 1;
    y++
  ) {
    for (
      let x = 1;
      x < localWidth - 1;
      x++
    ) {
      const globalX =
        left + x;

      const globalY =
        top + y;

      const maskIndex =
        globalY * width +
        globalX;

      if (!mask[maskIndex]) {
        continue;
      }

      const p =
        (y * localWidth + x) * 4;

      const leftP =
        (y * localWidth + (x - 1)) * 4;

      const rightP =
        (y * localWidth + (x + 1)) * 4;

      const topP =
        ((y - 1) * localWidth + x) * 4;

      const bottomP =
        ((y + 1) * localWidth + x) * 4;

      const avgR =
        (
          image.data[leftP] +
          image.data[rightP] +
          image.data[topP] +
          image.data[bottomP]
        ) / 4;

      const avgG =
        (
          image.data[leftP + 1] +
          image.data[rightP + 1] +
          image.data[topP + 1] +
          image.data[bottomP + 1]
        ) / 4;

      const avgB =
        (
          image.data[leftP + 2] +
          image.data[rightP + 2] +
          image.data[topP + 2] +
          image.data[bottomP + 2]
        ) / 4;

      result[p] =
        image.data[p] * (1 - strength) +
        avgR * strength;

      result[p + 1] =
        image.data[p + 1] * (1 - strength) +
        avgG * strength;

      result[p + 2] =
        image.data[p + 2] * (1 - strength) +
        avgB * strength;
    }
  }

  ctx.putImageData(
    new ImageData(
      result,
      localWidth,
      localHeight
    ),
    left,
    top
  );
}

/**
 * =========================================================
 * ÉCLAIRCISSEMENT DE LA PEAU
 * =========================================================
 */
function applyBrightenSkin(
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

  const points =
    getPoints(
      landmarks,
      LM.faceOval,
      width,
      height
    );

  if (points.length < 3) return;

  const mask =
    buildPolygonMask(
      points,
      width,
      height
    );

  const left =
    Math.max(
      0,
      Math.floor(face.left)
    );

  const right =
    Math.min(
      width - 1,
      Math.ceil(face.right)
    );

  const top =
    Math.max(
      0,
      Math.floor(face.top)
    );

  const bottom =
    Math.min(
      height - 1,
      Math.ceil(face.bottom)
    );

  const image =
    ctx.getImageData(
      left,
      top,
      Math.max(
        1,
        right - left + 1
      ),
      Math.max(
        1,
        bottom - top + 1
      )
    );

  const strength =
    Math.min(
      0.09,
      amount * 0.055
    );

  for (
    let y = 0;
    y < image.height;
    y++
  ) {
    for (
      let x = 0;
      x < image.width;
      x++
    ) {
      const globalX =
        left + x;

      const globalY =
        top + y;

      if (
        !mask[
          globalY * width +
          globalX
        ]
      ) {
        continue;
      }

      const p =
        (y * image.width + x) * 4;

      image.data[p] =
        clamp(
          image.data[p] +
          255 * strength
        );

      image.data[p + 1] =
        clamp(
          image.data[p + 1] +
          255 * strength * 0.95
        );

      image.data[p + 2] =
        clamp(
          image.data[p + 2] +
          255 * strength * 0.9
        );
    }
  }

  ctx.putImageData(
    image,
    left,
    top
  );
}

/**
 * =========================================================
 * AGRANDIR LES YEUX
 * =========================================================
 *
 * Effet léger pour éviter le tremblement.
 */
function applyEnlargeEye(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  indices: number[],
  amount: number
) {
  if (amount <= 0) return;

  const points =
    getPoints(
      landmarks,
      indices,
      width,
      height
    );

  if (points.length < 3) return;

  const c =
    center(points);

  const eyeWidth =
    distance(
      points[0],
      points[Math.min(
        8,
        points.length - 1
      )]
    );

  const radius =
    Math.max(
      30,
      eyeWidth * 1.7
    );

  const image =
    ctx.getImageData(
      Math.max(
        0,
        Math.floor(c.x - radius)
      ),
      Math.max(
        0,
        Math.floor(c.y - radius)
      ),
      Math.min(
        width,
        Math.ceil(c.x + radius) -
        Math.floor(c.x - radius)
      ),
      Math.min(
        height,
        Math.ceil(c.y + radius) -
        Math.floor(c.y - radius)
      )
    );

  const startX =
    Math.max(
      0,
      Math.floor(c.x - radius)
    );

  const startY =
    Math.max(
      0,
      Math.floor(c.y - radius)
    );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const strength =
    Math.min(
      0.10,
      amount * 0.075
    );

  for (
    let y = 0;
    y < image.height;
    y++
  ) {
    for (
      let x = 0;
      x < image.width;
      x++
    ) {
      const gx =
        startX + x;

      const gy =
        startY + y;

      const dx =
        gx - c.x;

      const dy =
        gy - c.y;

      const d =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (d >= radius) {
        continue;
      }

      const falloff =
        1 - d / radius;

      const scale =
        1 -
        strength *
        falloff;

      const sourceX =
        Math.round(
          c.x +
          dx * scale
        );

      const sourceY =
        Math.round(
          c.y +
          dy * scale
        );

      if (
        sourceX < 0 ||
        sourceX >= width ||
        sourceY < 0 ||
        sourceY >= height
      ) {
        continue;
      }

      const sourceLocalX =
        sourceX - startX;

      const sourceLocalY =
        sourceY - startY;

      if (
        sourceLocalX < 0 ||
        sourceLocalX >= image.width ||
        sourceLocalY < 0 ||
        sourceLocalY >= image.height
      ) {
        continue;
      }

      const source =
        (
          sourceLocalY *
          image.width +
          sourceLocalX
        ) * 4;

      const target =
        (
          y *
          image.width +
          x
        ) * 4;

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
      image.width,
      image.height
    ),
    startX,
    startY
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

  /**
   * Valeur volontairement douce.
   */
  const safeAmount =
    Math.min(
      1,
      amount
    );

  applyEnlargeEye(
    ctx,
    landmarks,
    width,
    height,
    LM.leftEye,
    safeAmount
  );

  applyEnlargeEye(
    ctx,
    landmarks,
    width,
    height,
    LM.rightEye,
    safeAmount
  );
}

/**
 * =========================================================
 * VISAGE PLUS FIN
 * =========================================================
 */
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

  const radiusX =
    face.width * 0.52;

  const radiusY =
    face.height * 0.52;

  const left =
    Math.max(
      0,
      Math.floor(
        face.cx - radiusX
      )
    );

  const top =
    Math.max(
      0,
      Math.floor(
        face.cy - radiusY
      )
    );

  const regionWidth =
    Math.min(
      width - left,
      Math.ceil(
        radiusX * 2
      )
    );

  const regionHeight =
    Math.min(
      height - top,
      Math.ceil(
        radiusY * 2
      )
    );

  if (
    regionWidth <= 2 ||
    regionHeight <= 2
  ) {
    return;
  }

  const image =
    ctx.getImageData(
      left,
      top,
      regionWidth,
      regionHeight
    );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const strength =
    Math.min(
      0.075,
      amount * 0.055
    );

  for (
    let y = 0;
    y < image.height;
    y++
  ) {
    const gy =
      top + y;

    const normalizedY =
      (gy - face.cy) /
      radiusY;

    const vertical =
      Math.max(
        0,
        1 -
        Math.abs(
          normalizedY
        )
      );

    for (
      let x = 0;
      x < image.width;
      x++
    ) {
      const gx =
        left + x;

      const dx =
        gx - face.cx;

      const normalizedX =
        Math.abs(dx) /
        radiusX;

      if (
        normalizedX >= 1
      ) {
        continue;
      }

      const edge =
        Math.pow(
          normalizedX,
          2
        );

      const warp =
        strength *
        vertical *
        edge;

      const sourceX =
        Math.round(
          face.cx +
          dx *
          (1 + warp)
        );

      if (
        sourceX < left ||
        sourceX >=
          left +
          image.width
      ) {
        continue;
      }

      const source =
        (
          y *
          image.width +
          (sourceX - left)
        ) * 4;

      const target =
        (
          y *
          image.width +
          x
        ) * 4;

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
      image.width,
      image.height
    ),
    left,
    top
  );
}

/**
 * =========================================================
 * DENTS PLUS BLANCHES
 * =========================================================
 */
function applyWhitenTeeth(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  amount: number
) {
  if (amount <= 0) return;

  const inner =
    getPoints(
      landmarks,
      LM.innerLips,
      width,
      height
    );

  if (inner.length < 3) return;

  const mask =
    buildPolygonMask(
      inner,
      width,
      height
    );

  const face =
    getFaceGeometry(
      landmarks,
      width,
      height
    );

  const left =
    Math.max(
      0,
      Math.floor(face.left)
    );

  const right =
    Math.min(
      width - 1,
      Math.ceil(face.right)
    );

  const top =
    Math.max(
      0,
      Math.floor(face.top)
    );

  const bottom =
    Math.min(
      height - 1,
      Math.ceil(face.bottom)
    );

  const image =
    ctx.getImageData(
      left,
      top,
      Math.max(
        1,
        right - left + 1
      ),
      Math.max(
        1,
        bottom - top + 1
      )
    );

  const strength =
    Math.min(
      0.12,
      amount * 0.09
    );

  for (
    let y = 0;
    y < image.height;
    y++
  ) {
    for (
      let x = 0;
      x < image.width;
      x++
    ) {
      const gx =
        left + x;

      const gy =
        top + y;

      if (
        !mask[
          gy * width +
          gx
        ]
      ) {
        continue;
      }

      const p =
        (
          y *
          image.width +
          x
        ) * 4;

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
  }

  ctx.putImageData(
    image,
    left,
    top
  );
}

/**
 * =========================================================
 * LÈVRES
 * =========================================================
 */
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

  if (points.length < 3) return;

  const c =
    center(points);

  const face =
    getFaceGeometry(
      landmarks,
      width,
      height
    );

  const radius =
    Math.max(
      25,
      Math.min(
        face.width,
        face.height
      ) * 0.18
    );

  const left =
    Math.max(
      0,
      Math.floor(
        c.x - radius
      )
    );

  const top =
    Math.max(
      0,
      Math.floor(
        c.y - radius
      )
    );

  const right =
    Math.min(
      width - 1,
      Math.ceil(
        c.x + radius
      )
    );

  const bottom =
    Math.min(
      height - 1,
      Math.ceil(
        c.y + radius
      )
    );

  const image =
    ctx.getImageData(
      left,
      top,
      Math.max(
        1,
        right - left + 1
      ),
      Math.max(
        1,
        bottom - top + 1
      )
    );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const strength =
    Math.min(
      0.10,
      amount * 0.075
    );

  for (
    let y = 0;
    y < image.height;
    y++
  ) {
    for (
      let x = 0;
      x < image.width;
      x++
    ) {
      const gx =
        left + x;

      const gy =
        top + y;

      const dx =
        gx - c.x;

      const dy =
        gy - c.y;

      const d =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (d >= radius) {
        continue;
      }

      const falloff =
        1 - d / radius;

      const scale =
        1 -
        strength *
        falloff;

      const sx =
        Math.round(
          c.x +
          dx * scale
        );

      const sy =
        Math.round(
          c.y +
          dy * scale
        );

      if (
        sx < left ||
        sx >= left + image.width ||
        sy < top ||
        sy >= top + image.height
      ) {
        continue;
      }

      const source =
        (
          (sy - top) *
          image.width +
          (sx - left)
        ) * 4;

      const target =
        (
          y *
          image.width +
          x
        ) * 4;

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
      image.width,
      image.height
    ),
    left,
    top
  );
}

/**
 * =========================================================
 * SYMÉTRIE
 * =========================================================
 */
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

  const left =
    Math.max(
      0,
      Math.floor(face.left)
    );

  const right =
    Math.min(
      width - 1,
      Math.ceil(face.right)
    );

  const top =
    Math.max(
      0,
      Math.floor(face.top)
    );

  const bottom =
    Math.min(
      height - 1,
      Math.ceil(face.bottom)
    );

  const image =
    ctx.getImageData(
      left,
      top,
      Math.max(
        1,
        right - left + 1
      ),
      Math.max(
        1,
        bottom - top + 1
      )
    );

  const result =
    new Uint8ClampedArray(
      image.data
    );

  const strength =
    Math.min(
      0.08,
      amount * 0.055
    );

  const centerX =
    face.cx;

  for (
    let y = 0;
    y < image.height;
    y++
  ) {
    const gy =
      top + y;

    for (
      let x = 0;
      x < image.width;
      x++
    ) {
      const gx =
        left + x;

      if (gx >= centerX) {
        continue;
      }

      const mirroredX =
        Math.round(
          centerX +
          (centerX - gx)
        );

      if (
        mirroredX < left ||
        mirroredX >=
          left + image.width
      ) {
        continue;
      }

      const source =
        (
          y *
          image.width +
          (mirroredX - left)
        ) * 4;

      const target =
        (
          y *
          image.width +
          x
        ) * 4;

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
      image.width,
      image.height
    ),
    left,
    top
  );
}

/**
 * =========================================================
 * MOTEUR PRINCIPAL
 * =========================================================
 */
export function applyBeautyEffects(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  config: BeautyConfig
) {
  if (
    !landmarks ||
    landmarks.length === 0
  ) {
    return;
  }

  /**
   * Chaque effet est indépendant.
   *
   * Une valeur absente = aucun traitement.
   */

  if (
    (config.smoothSkin ?? 0) > 0
  ) {
    applySmoothSkin(
      ctx,
      landmarks,
      width,
      height,
      config.smoothSkin ?? 0
    );
  }

  if (
    (config.brightenSkin ?? 0) > 0
  ) {
    applyBrightenSki