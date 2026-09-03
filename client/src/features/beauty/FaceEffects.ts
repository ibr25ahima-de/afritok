import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "@/components/EffectsPanel";
import { LM, getFaceGeometry, getPoints } from "@/components/faceUtils";

type Point = { x: number; y: number };

function points(l: NormalizedLandmark[], ids: number[], w: number, h: number) {
  return getPoints(l, ids, w, h);
}

function avg(p: Point[]): Point {
  if (!p.length) return { x: 0, y: 0 };
  return p.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
}

function center(p: Point[]): Point {
  const a = avg(p);
  return p.length ? { x: a.x / p.length, y: a.y / p.length } : a;
}

function ellipse(ctx: CanvasRenderingContext2D, p: Point, rx: number, ry: number, fill?: string, stroke?: string, line = 1) {
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

function polygon(ctx: CanvasRenderingContext2D, p: Point[], fill?: string, stroke?: string, line = 1) {
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
  ctx.stroke();
}

function eyeCenters(l: NormalizedLandmark[], w: number, h: number) {
  return [center(points(l, LM.leftEye, w, h)), center(points(l, LM.rightEye, w, h))];
}

function drawCat(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h);
  const left = { x: f.left + f.width * .17, y: f.top + f.height * .08 };
  const right = { x: f.right - f.width * .17, y: f.top + f.height * .08 };
  const ear = (c: Point, flip: number) => polygon(ctx, [
    { x: c.x - f.width * .16 * flip, y: c.y + f.height * .04 },
    { x: c.x - f.width * .04 * flip, y: c.y - f.height * .25 },
    { x: c.x + f.width * .12 * flip, y: c.y + f.height * .06 },
  ], "rgba(245,110,165,.88)", "rgba(255,255,255,.9)", 2);
  ear(left, 1); ear(right, -1);
  const eyes = eyeCenters(l, w, h);
  eyes.forEach(e => ellipse(ctx, { x: e.x, y: e.y }, f.width * .055, f.height * .025, "rgba(20,10,20,.9)"));
  const nose = center(points(l, LM.nose, w, h));
  ellipse(ctx, { x: nose.x, y: nose.y + f.height * .015 }, f.width * .025, f.height * .018, "rgba(255,120,165,.95)");
  line(ctx, [{ x: nose.x - f.width * .02, y: nose.y + f.height * .03 }, { x: nose.x - f.width * .12, y: nose.y + f.height * .015 }], "rgba(255,255,255,.8)", 1.5);
  line(ctx, [{ x: nose.x + f.width * .02, y: nose.y + f.height * .03 }, { x: nose.x + f.width * .12, y: nose.y + f.height * .015 }], "rgba(255,255,255,.8)", 1.5);
}

function drawBunny(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h);
  const top = f.top - f.height * .28;
  const cx = f.cx;
  const ears = [cx - f.width * .20, cx + f.width * .20];
  ears.forEach(x => {
    ellipse(ctx, { x, y: top }, f.width * .105, f.height * .30, "rgba(245,220,230,.82)", "rgba(255,255,255,.95)", 2);
    ellipse(ctx, { x, y: top }, f.width * .055, f.height * .22, "rgba(235,120,160,.55)");
  });
  const mouth = center(points(l, LM.outerLips, w, h));
  ellipse(ctx, { x: mouth.x, y: mouth.y }, f.width * .055, f.height * .04, "rgba(250,120,150,.8)");
}

function drawGlasses(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, style: "dark" | "heart") {
  const f = getFaceGeometry(l, w, h);
  const eyes = eyeCenters(l, w, h);
  if (style === "heart") {
    eyes.forEach(e => {
      const s = f.width * .055;
      polygon(ctx, [
        { x: e.x, y: e.y + s * .8 }, { x: e.x - s * 1.5, y: e.y - s * .45 },
        { x: e.x - s * .8, y: e.y - s * 1.1 }, { x: e.x, y: e.y - s * .45 },
        { x: e.x + s * .8, y: e.y - s * 1.1 }, { x: e.x + s * 1.5, y: e.y - s * .45 },
      ], "rgba(255,70,105,.82)", "rgba(255,255,255,.9)", 2);
    });
    return;
  }
  eyes.forEach(e => ellipse(ctx, e, f.width * .13, f.height * .065, "rgba(12,18,25,.72)", "rgba(255,255,255,.95)", 2));
  line(ctx, [{ x: eyes[0].x + f.width * .10, y: eyes[0].y }, { x: eyes[1].x - f.width * .10, y: eyes[1].y }], "rgba(255,255,255,.9)", 3);
}

function drawCrown(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h);
  const y = f.top - f.height * .10;
  polygon(ctx, [
    { x: f.cx - f.width * .30, y: y + f.height * .09 },
    { x: f.cx - f.width * .22, y: y - f.height * .08 },
    { x: f.cx - f.width * .08, y: y + f.height * .03 },
    { x: f.cx, y: y - f.height * .13 },
    { x: f.cx + f.width * .08, y: y + f.height * .03 },
    { x: f.cx + f.width * .22, y: y - f.height * .08 },
    { x: f.cx + f.width * .30, y: y + f.height * .09 },
  ], "rgba(255,205,55,.92)", "rgba(255,255,255,.95)", 2);
  line(ctx, [{ x: f.cx - f.width * .30, y: y + f.height * .09 }, { x: f.cx + f.width * .30, y: y + f.height * .09 }], "rgba(255,255,255,.95)", 3);
}

function drawMakeup(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, strong = false) {
  const f = getFaceGeometry(l, w, h);
  const eyes = eyeCenters(l, w, h);
  const amount = strong ? .58 : .35;
  eyes.forEach(e => {
    ellipse(ctx, { x: e.x - f.width * .045, y: e.y + f.height * .025 }, f.width * .065, f.height * .035, `rgba(185,65,150,${amount})`);
    ellipse(ctx, { x: e.x + f.width * .045, y: e.y + f.height * .025 }, f.width * .065, f.height * .035, `rgba(185,65,150,${amount})`);
  });
  const cheeks = [
    { x: f.cx - f.width * .25, y: f.cy + f.height * .10 },
    { x: f.cx + f.width * .25, y: f.cy + f.height * .10 },
  ];
  cheeks.forEach(c => ellipse(ctx, c, f.width * .10, f.height * .055, `rgba(255,90,130,${strong ? .26 : .18})`));
  const lips = points(l, LM.outerLips, w, h);
  polygon(ctx, lips, `rgba(235,65,105,${strong ? .48 : .30})`);
}

function drawFreckles(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h);
  const nose = center(points(l, LM.nose, w, h));
  for (let i = -4; i <= 4; i++) {
    for (let j = 0; j < 2; j++) {
      const x = nose.x + i * f.width * .045;
      const y = nose.y + f.height * (.08 + j * .035) + Math.abs(i) * f.height * .006;
      ellipse(ctx, { x, y }, f.width * .008, f.width * .008, "rgba(125,70,45,.62)");
    }
  }
}

function drawTears(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h);
  const eyes = eyeCenters(l, w, h);
  eyes.forEach(e => {
    const p = [{ x: e.x, y: e.y + f.height * .04 }, { x: e.x - f.width * .015, y: e.y + f.height * .16 }, { x: e.x, y: e.y + f.height * .20 }, { x: e.x + f.width * .015, y: e.y + f.height * .16 }];
    polygon(ctx, p, "rgba(85,185,255,.72)");
  });
}

function drawNeon(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h);
  const oval = points(l, LM.faceOval, w, h);
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = "rgba(80,220,255,.9)";
  line(ctx, [...oval, oval[0]], "rgba(100,235,255,.82)", Math.max(2, f.width * .008));
  ctx.restore();
  const eyes = eyeCenters(l, w, h);
  eyes.forEach(e => ellipse(ctx, e, f.width * .055, f.height * .025, "rgba(40,255,210,.30)", "rgba(90,255,240,.95)", 2));
}

export function renderFaceEffect(ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number, effect: AREffect | null) {
  if (!effect || !landmarks?.length) return;
  const id = effect.id;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  try {
    switch (id) {
      case "effect-cat": drawCat(ctx, landmarks, width, height); break;
      case "effect-bunny": drawBunny(ctx, landmarks, width, height); break;
      case "effect-sunglasses": drawGlasses(ctx, landmarks, width, height, "dark"); break;
      case "effect-heart-eyes": drawGlasses(ctx, landmarks, width, height, "heart"); break;
      case "effect-crown": drawCrown(ctx, landmarks, width, height); break;
      case "effect-makeup": drawMakeup(ctx, landmarks, width, height, false); break;
      case "effect-glam": drawMakeup(ctx, landmarks, width, height, true); break;
      case "effect-freckles": drawFreckles(ctx, landmarks, width, height); break;
      case "effect-tears": drawTears(ctx, landmarks, width, height); break;
      case "effect-neon": drawNeon(ctx, landmarks, width, height); break;
    }
  } finally {
    ctx.restore();
  }
}
