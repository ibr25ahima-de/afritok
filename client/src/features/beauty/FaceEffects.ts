import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "@/features/ar/ARRegistry";
import { LM, getFaceGeometry, getPoints } from "@/components/faceUtils";

type Point = { x: number; y: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function points(l: NormalizedLandmark[], ids: number[], w: number, h: number) {
  return getPoints(l, ids, w, h);
}

function center(p: Point[]): Point {
  if (!p.length) return { x: 0, y: 0 };
  let x = 0, y = 0;
  for (const q of p) { x += q.x; y += q.y; }
  return { x: x / p.length, y: y / p.length };
}

function eyeCenters(l: NormalizedLandmark[], w: number, h: number) {
  return [center(points(l, LM.leftEye, w, h)), center(points(l, LM.rightEye, w, h))];
}

function headAngle(l: NormalizedLandmark[], w: number, h: number) {
  const [a, b] = eyeCenters(l, w, h);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function ellipse(ctx: CanvasRenderingContext2D, p: Point, rx: number, ry: number, fill?: string, stroke?: string, line = 1, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, rotation, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

function polygon(ctx: CanvasRenderingContext2D, p: Point[], fill?: string | CanvasGradient, stroke?: string, line = 1) {
  if (p.length < 3) return;
  ctx.beginPath();
  p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

function line(ctx: CanvasRenderingContext2D, p: Point[], stroke: string, width: number) {
  if (p.length < 2) return;
  ctx.beginPath();
  p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function glow(ctx: CanvasRenderingContext2D, draw: () => void, blur: number, color = "rgba(255,255,255,.8)") {
  ctx.save();
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
  draw();
  ctx.restore();
}

function faceMask(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, draw: () => void) {
  const oval = points(l, LM.faceOval, w, h);
  if (oval.length < 3) return;
  ctx.save();
  polygon(ctx, oval);
  ctx.clip();
  draw();
  ctx.restore();
}

function drawCat(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), a = headAngle(l, w, h), ca = Math.cos(a), sa = Math.sin(a);
  const local = (x: number, y: number): Point => ({ x: f.cx + x * ca - y * sa, y: f.top + y * ca + x * sa });
  ctx.save();
  const ears = [local(-f.width * .22, -f.height * .02), local(f.width * .22, -f.height * .02)];
  ears.forEach((e, i) => {
    const dir = i ? 1 : -1;
    polygon(ctx, [
      { x: e.x - f.width * .14 * dir, y: e.y + f.height * .07 },
      { x: e.x - f.width * .03 * dir, y: e.y - f.height * .25 },
      { x: e.x + f.width * .14 * dir, y: e.y + f.height * .08 },
    ], "rgba(235,105,163,.94)", "rgba(255,255,255,.95)", 2.2);
    polygon(ctx, [
      { x: e.x - f.width * .075 * dir, y: e.y + f.height * .035 },
      { x: e.x - f.width * .03 * dir, y: e.y - f.height * .15 },
      { x: e.x + f.width * .075 * dir, y: e.y + f.height * .045 },
    ], "rgba(120,35,105,.58)");
  });
  ctx.restore();

  const eyes = eyeCenters(l, w, h);
  eyes.forEach((e) => {
    ellipse(ctx, e, f.width * .055, f.height * .030, "rgba(18,10,18,.94)", "rgba(255,255,255,.9)", 1.4);
    ellipse(ctx, { x: e.x - f.width * .012, y: e.y - f.height * .008 }, f.width * .015, f.height * .010, "white");
    line(ctx, [{ x: e.x - f.width * .045, y: e.y - f.height * .026 }, { x: e.x - f.width * .105, y: e.y - f.height * .055 }], "rgba(20,10,25,.95)", Math.max(2, f.width * .007));
  });

  const nose = center(points(l, LM.nose, w, h));
  ellipse(ctx, { x: nose.x, y: nose.y + f.height * .016 }, f.width * .027, f.height * .019, "rgba(255,94,157,.98)", "white", 1);
  line(ctx, [{ x: nose.x, y: nose.y + f.height * .028 }, { x: nose.x, y: nose.y + f.height * .062 }], "white", 1.5);
  for (const side of [-1, 1]) for (const y of [.01, .055, .10]) {
    line(ctx, [{ x: nose.x + side * f.width * .025, y: nose.y + f.height * .035 }, { x: nose.x + side * f.width * (.15 + y), y: nose.y + f.height * (.02 + y) }], "rgba(255,255,255,.85)", 1.3);
  }
}

function drawBunny(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), a = headAngle(l, w, h);
  ctx.save();
  ctx.translate(f.cx, f.top - f.height * .12);
  ctx.rotate(a);
  [-1, 1].forEach(side => {
    ellipse(ctx, { x: side * f.width * .20, y: 0 }, f.width * .11, f.height * .31, "rgba(249,225,235,.90)", "rgba(255,255,255,.98)", 2.2);
    ellipse(ctx, { x: side * f.width * .20, y: 0 }, f.width * .052, f.height * .235, "rgba(232,99,151,.58)");
  });
  ctx.restore();
  const nose = center(points(l, LM.nose, w, h));
  ellipse(ctx, { x: nose.x, y: nose.y + f.height * .02 }, f.width * .028, f.height * .020, "rgba(249,123,174,.96)", "white", 1);
  line(ctx, [{ x: nose.x, y: nose.y + f.height * .03 }, { x: nose.x, y: nose.y + f.height * .075 }], "rgba(255,255,255,.85)", 1.5);
  const cheeks = [
    { x: f.cx - f.width * .255, y: f.cy + f.height * .11 },
    { x: f.cx + f.width * .255, y: f.cy + f.height * .11 },
  ];
  cheeks.forEach(c => {
    ctx.save();
    ctx.filter = `blur(${Math.max(5, f.width * .035)}px)`;
    ellipse(ctx, c, f.width * .105, f.height * .058, "rgba(255,80,145,.32)");
    ctx.restore();
  });
}

function drawGlasses(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, style: "dark" | "heart") {
  const f = getFaceGeometry(l, w, h), eyes = eyeCenters(l, w, h), a = headAngle(l, w, h);
  if (style === "heart") {
    const pulse = 1 + .06 * Math.sin(performance.now() / 180);
    eyes.forEach(e => {
      const s = f.width * .075 * pulse;
      const heart = [
        { x: e.x, y: e.y + s * 1.00 },
        { x: e.x - s * 1.42, y: e.y - s * .25 },
        { x: e.x - s * .76, y: e.y - s * 1.02 },
        { x: e.x, y: e.y - s * .42 },
        { x: e.x + s * .76, y: e.y - s * 1.02 },
        { x: e.x + s * 1.42, y: e.y - s * .25 },
      ];
      polygon(ctx, heart, "rgba(255,38,106,.92)", "rgba(255,255,255,.98)", 2);
      ellipse(ctx, { x: e.x - s * .35, y: e.y - s * .40 }, s * .16, s * .10, "rgba(255,255,255,.9)");
    });
    return;
  }

  const [left, right] = eyes;
  const eyeDistance = Math.hypot(right.x - left.x, right.y - left.y);
  if (!Number.isFinite(eyeDistance) || eyeDistance < 20) return;
  const lensW = eyeDistance * .53;
  const lensH = Math.max(eyeDistance * .34, f.height * .085);
  const rim = Math.max(2.5, eyeDistance * .019);
  const bridge = eyeDistance * .105;
  const cx = (left.x + right.x) / 2;
  const cy = (left.y + right.y) / 2;
  const ca = Math.cos(a), sa = Math.sin(a);
  const local = (x: number, y: number): Point => ({ x: cx + x * ca - y * sa, y: cy + y * ca + x * sa });

  ctx.save();
  line(ctx, [local(-eyeDistance * .20, -lensH * .03), local(-eyeDistance * .50, -lensH * .015), local(-f.width * .49, -f.height * .004)], "rgba(10,12,17,.98)", rim * 1.18);
  line(ctx, [local(eyeDistance * .20, -lensH * .03), local(eyeDistance * .50, -lensH * .015), local(f.width * .49, -f.height * .004)], "rgba(10,12,17,.98)", rim * 1.18);

  const drawLens = (eye: Point) => {
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(a);
    const x = -lensW / 2, y = -lensH / 2, radius = Math.min(lensH * .30, lensW * .18);
    const g = ctx.createLinearGradient(0, y, 0, y + lensH);
    g.addColorStop(0, "rgba(35,43,62,.96)");
    g.addColorStop(.48, "rgba(16,22,35,.86)");
    g.addColorStop(1, "rgba(2,5,10,.98)");
    ctx.fillStyle = g;
    ctx.shadowColor = "rgba(0,0,0,.60)";
    ctx.shadowBlur = 7;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, lensW, lensH, radius);
    else ctx.ellipse(0, 0, lensW / 2, lensH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(246,248,252,.98)";
    ctx.lineWidth = rim;
    ctx.stroke();

    const reflection = ctx.createLinearGradient(x, y, x + lensW, y + lensH);
    reflection.addColorStop(0, "rgba(255,255,255,0)");
    reflection.addColorStop(.44, "rgba(255,255,255,.02)");
    reflection.addColorStop(.56, "rgba(255,255,255,.36)");
    reflection.addColorStop(.68, "rgba(255,255,255,.03)");
    reflection.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = reflection;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, lensW, lensH, radius);
    else ctx.ellipse(0, 0, lensW / 2, lensH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawLens(left);
  drawLens(right);
  line(ctx, [local(-bridge, -lensH * .02), local(0, lensH * .08), local(bridge, lensH * .02)], "rgba(244,247,252,.98)", rim * 1.05);
  ctx.restore();
}

function drawCrown(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), a = headAngle(l, w, h);
  ctx.save();
  ctx.translate(f.cx, f.top - f.height * .08);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(-f.width * .34, 0, f.width * .34, 0);
  g.addColorStop(0, "#e8a719");
  g.addColorStop(.5, "#ffe978");
  g.addColorStop(1, "#d9930d");
  glow(ctx, () => polygon(ctx, [
    { x: -f.width * .34, y: f.height * .11 },
    { x: -f.width * .24, y: -f.height * .12 },
    { x: -f.width * .09, y: f.height * .025 },
    { x: 0, y: -f.height * .17 },
    { x: f.width * .09, y: f.height * .025 },
    { x: f.width * .24, y: -f.height * .12 },
    { x: f.width * .34, y: f.height * .11 },
  ], g, "rgba(255,255,255,.98)", 2), 8, "rgba(255,214,55,.65)");
  line(ctx, [{ x: -f.width * .34, y: f.height * .11 }, { x: f.width * .34, y: f.height * .11 }], "rgba(255,246,175,.98)", Math.max(3, f.width * .013));
  [-.24, 0, .24].forEach(x => ellipse(ctx, { x: f.width * x, y: x === 0 ? -f.height * .075 : -f.height * .035 }, f.width * .026, f.width * .026, "rgba(105,190,255,.98)", "white", 1));
  ctx.restore();
}

function upperLid(eyePoints: Point[]): Point[] {
  if (eyePoints.length < 16) return eyePoints;
  return [...eyePoints.slice(8), eyePoints[0]];
}

function featheredFill(
  w: number, h: number, shape: Point[], fill: string | CanvasGradient, feather: number,
): HTMLCanvasElement | null {
  if (shape.length < 3) return null;
  const mask = document.createElement("canvas");
  mask.width = w; mask.height = h;
  const m = mask.getContext("2d");
  if (!m) return null;
  polygon(m, shape, "white");
  if (feather > 0) {
    const soft = document.createElement("canvas");
    soft.width = w; soft.height = h;
    const s = soft.getContext("2d")!;
    s.filter = `blur(${feather}px)`;
    s.drawImage(mask, 0, 0);
    const layer = document.createElement("canvas");
    layer.width = w; layer.height = h;
    const lctx = layer.getContext("2d")!;
    lctx.fillStyle = fill;
    lctx.fillRect(0, 0, w, h);
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(soft, 0, 0);
    return layer;
  }
  const layer = document.createElement("canvas");
  layer.width = w; layer.height = h;
  const lctx = layer.getContext("2d")!;
  lctx.fillStyle = fill;
  lctx.fillRect(0, 0, w, h);
  lctx.globalCompositeOperation = "destination-in";
  lctx.drawImage(mask, 0, 0);
  return layer;
}

function drawMakeup(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, strong = false) {
  const f = getFaceGeometry(l, w, h), power = strong ? .8 : .55;

  [LM.leftEye, LM.rightEye].forEach((ids) => {
    const eyePts = points(l, ids, w, h);
    if (eyePts.length < 16) return;
    const lid = upperLid(eyePts);
    const c = center(eyePts);
    const puffed = lid.map((p) => ({ x: p.x + (p.x - c.x) * 0.18, y: p.y + (p.y - c.y) * 0.5 - f.height * .012 }));
    const shape = [...lid, ...puffed.reverse()];
    const layer = featheredFill(w, h, shape, `rgba(183,68,221,${power * .5})`, Math.max(3, f.width * .02));
    if (layer) ctx.drawImage(layer, 0, 0);
  });

  [LM.leftEye, LM.rightEye].forEach((ids) => {
    const eyePts = points(l, ids, w, h);
    if (eyePts.length < 16) return;
    const lid = upperLid(eyePts);
    const outer = lid[lid.length - 1];
    const prev = lid[lid.length - 2];
    const dir = { x: outer.x - prev.x, y: outer.y - prev.y };
    const mag = Math.hypot(dir.x, dir.y) || 1;
    const wing = { x: outer.x + (dir.x / mag) * f.width * .045, y: outer.y + (dir.y / mag) * f.width * .045 - f.height * .01 };
    ctx.save();
    ctx.shadowBlur = 1.2;
    ctx.shadowColor = "rgba(0,0,0,.5)";
    line(ctx, [...lid, wing], `rgba(20,12,28,${strong ? .92 : .78})`, Math.max(1.4, f.width * .0055));
    ctx.restore();
  });

  const cheekY = f.cy + f.height * .11;
  [-1, 1].forEach(side => {
    const c = { x: f.cx + side * f.width * .255, y: cheekY };
    ctx.save();
    ctx.filter = `blur(${Math.max(5, f.width * .035)}px)`;
    ellipse(ctx, c, f.width * .12, f.height * .065, `rgba(255,48,119,${strong ? .30 : .20})`);
    ctx.restore();
  });

  const lips = points(l, LM.outerLips, w, h);
  if (lips.length >= 3) {
    const g = ctx.createLinearGradient(f.cx, f.cy + f.height * .15, f.cx, f.cy + f.height * .28);
    g.addColorStop(0, `rgba(255,78,139,${strong ? .8 : .55})`);
    g.addColorStop(.55, `rgba(224,36,101,${strong ? .72 : .48})`);
    g.addColorStop(1, `rgba(155,16,66,${strong ? .62 : .40})`);
    const layer = featheredFill(w, h, lips, g, Math.max(1.5, f.width * .01));
    if (layer) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
    }
  }
}

function drawFreckles(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), n = center(points(l, LM.nose, w, h));
  const seed = [
    [-.19,.08],[-.15,.13],[-.11,.10],[-.07,.16],[-.03,.11],[.03,.12],[.07,.16],[.11,.10],[.15,.13],[.19,.08],
    [-.16,.21],[-.10,.24],[-.05,.20],[.05,.20],[.10,.24],[.16,.21],[-.08,.29],[.08,.29],
  ];
  seed.forEach(([x, y], i) => {
    const jitter = Math.sin(i * 13.17) * f.width * .006;
    ellipse(ctx, { x: n.x + x * f.width + jitter, y: n.y + y * f.height }, f.width * (.006 + (i % 3) * .001), f.width * (.006 + (i % 3) * .001), `rgba(130,70,42,${.60 + (i % 2) * .12})`);
  });
}

function drawTears(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), t = performance.now() / 900;
  eyeCenters(l, w, h).forEach((e, i) => {
    const drift = Math.sin(t + i) * f.height * .008;
    const p = [
      { x: e.x, y: e.y + f.height * .035 },
      { x: e.x - f.width * .022, y: e.y + f.height * .15 + drift },
      { x: e.x, y: e.y + f.height * .225 + drift },
      { x: e.x + f.width * .022, y: e.y + f.height * .15 + drift },
    ];
    const g = ctx.createLinearGradient(e.x, e.y + f.height * .04, e.x, e.y + f.height * .23);
    g.addColorStop(0, "rgba(205,246,255,.92)");
    g.addColorStop(.35, "rgba(70,190,255,.76)");
    g.addColorStop(1, "rgba(35,115,235,.44)");
    polygon(ctx, p, g, "rgba(238,252,255,.95)", 1.2);
    ellipse(ctx, { x: e.x - f.width * .006, y: e.y + f.height * .11 + drift }, f.width * .008, f.height * .022, "rgba(255,255,255,.88)");
  });
}

function drawNeon(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), oval = points(l, LM.faceOval, w, h);
  if (oval.length < 3) return;
  ctx.save();
  ctx.shadowBlur = Math.max(12, f.width * .045);
  ctx.shadowColor = "rgba(40,235,255,.95)";
  line(ctx, [...oval, oval[0]], "rgba(82,238,255,.94)", Math.max(3, f.width * .009));
  ctx.restore();
  eyeCenters(l, w, h).forEach(e => glow(ctx, () => ellipse(ctx, e, f.width * .064, f.height * .030, "rgba(50,255,210,.22)", "rgba(90,255,240,.98)", 2.4), 9, "rgba(70,255,225,.85)"));
}

export function renderFaceEffect(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, effect: AREffect | null) {
  if (!effect || !landmarks?.length || effect.renderer === "none") return;
  ctx.save();
  try {
    switch (effect.renderer) {
      case "cat": drawCat(ctx, landmarks, width, height); break;
      case "bunny": drawBunny(ctx, landmarks, width, height); break;
      case "sunglasses": drawGlasses(ctx, landmarks, width, height, "dark"); break;
      case "heart-eyes": drawGlasses(ctx, landmarks, width, height, "heart"); break;
      case "crown": drawCrown(ctx, landmarks, width, height); break;
      case "makeup": drawMakeup(ctx, landmarks, width, height, false); break;
      case "glam": drawMakeup(ctx, landmarks, width, height, true); break;
      case "freckles": drawFreckles(ctx, landmarks, width, height); break;
      case "tears": drawTears(ctx, landmarks, width, height); break;
      case "neon": drawNeon(ctx, landmarks, width, height); break;
    }
  } finally {
    ctx.restore();
  }
}
