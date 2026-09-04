import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "@/features/ar/ARRegistry";
import { LM, getFaceGeometry, getPoints } from "@/components/faceUtils";

type Point = { x: number; y: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function points(l: NormalizedLandmark[], ids: number[], w: number, h: number) { return getPoints(l, ids, w, h); }
function center(p: Point[]): Point { if (!p.length) return { x: 0, y: 0 }; const s = p.reduce((a, q) => ({ x: a.x + q.x, y: a.y + q.y }), { x: 0, y: 0 }); return { x: s.x / p.length, y: s.y / p.length }; }
function eyeCenters(l: NormalizedLandmark[], w: number, h: number) { return [center(points(l, LM.leftEye, w, h)), center(points(l, LM.rightEye, w, h))]; }
function headAngle(l: NormalizedLandmark[], w: number, h: number) { const [a, b] = eyeCenters(l, w, h); return Math.atan2(b.y - a.y, b.x - a.x); }
function ellipse(ctx: CanvasRenderingContext2D, p: Point, rx: number, ry: number, fill?: string, stroke?: string, line = 1, rotation = 0) { ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, rotation, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); } }
function polygon(ctx: CanvasRenderingContext2D, p: Point[], fill?: string, stroke?: string, line = 1) { if (p.length < 3) return; ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); } }
function line(ctx: CanvasRenderingContext2D, p: Point[], stroke: string, width: number) { if (p.length < 2) return; ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }
function glow(ctx: CanvasRenderingContext2D, draw: () => void, blur: number) { ctx.save(); ctx.shadowBlur = blur; ctx.shadowColor = "rgba(255,255,255,.8)"; draw(); ctx.restore(); }

function drawCat(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), a = headAngle(l, w, h), ca = Math.cos(a), sa = Math.sin(a);
  const local = (x: number, y: number): Point => ({ x: f.cx + x * ca - y * sa, y: f.top + y * ca + x * sa });
  ctx.save();
  ctx.globalAlpha = .88;
  const ears = [local(-f.width * .22, -f.height * .02), local(f.width * .22, -f.height * .02)];
  ears.forEach((e, i) => {
    const dir = i ? 1 : -1;
    polygon(ctx, [{ x: e.x - f.width * .14 * dir, y: e.y + f.height * .06 }, { x: e.x - f.width * .03 * dir, y: e.y - f.height * .25 }, { x: e.x + f.width * .13 * dir, y: e.y + f.height * .08 }], "rgba(245,94,163,.92)", "rgba(255,255,255,.95)", 2);
  });
  ctx.restore();
  const eyes = eyeCenters(l, w, h);
  eyes.forEach(e => {
    ellipse(ctx, e, f.width * .052, f.height * .027, "rgba(20,8,20,.92)");
    ellipse(ctx, { x: e.x, y: e.y - f.height * .008 }, f.width * .018, f.height * .008, "white");
    line(ctx, [{ x: e.x - f.width * .06, y: e.y - f.height * .035 }, { x: e.x - f.width * .11, y: e.y - f.height * .055 }], "rgba(20,8,20,.9)", Math.max(2, f.width * .007));
  });
  const nose = center(points(l, LM.nose, w, h));
  ellipse(ctx, { x: nose.x, y: nose.y + f.height * .015 }, f.width * .026, f.height * .018, "rgba(255,105,160,.96)");
  line(ctx, [{ x: nose.x - f.width * .015, y: nose.y + f.height * .03 }, { x: nose.x - f.width * .15, y: nose.y + f.height * .015 }], "rgba(255,255,255,.82)", 1.6);
  line(ctx, [{ x: nose.x + f.width * .015, y: nose.y + f.height * .03 }, { x: nose.x + f.width * .15, y: nose.y + f.height * .015 }], "rgba(255,255,255,.82)", 1.6);
  line(ctx, [{ x: nose.x - f.width * .01, y: nose.y + f.height * .04 }, { x: nose.x - f.width * .10, y: nose.y + f.height * .075 }], "rgba(255,255,255,.72)", 1.2);
  line(ctx, [{ x: nose.x + f.width * .01, y: nose.y + f.height * .04 }, { x: nose.x + f.width * .10, y: nose.y + f.height * .075 }], "rgba(255,255,255,.72)", 1.2);
}

function drawBunny(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), a = headAngle(l, w, h);
  ctx.save(); ctx.translate(f.cx, f.top - f.height * .15); ctx.rotate(a);
  [-1, 1].forEach(side => {
    ellipse(ctx, { x: side * f.width * .20, y: 0 }, f.width * .105, f.height * .30, "rgba(248,222,232,.86)", "rgba(255,255,255,.95)", 2);
    ellipse(ctx, { x: side * f.width * .20, y: 0 }, f.width * .052, f.height * .22, "rgba(235,110,155,.58)");
  });
  ctx.restore();
  const nose = center(points(l, LM.nose, w, h));
  ellipse(ctx, { x: nose.x, y: nose.y + f.height * .018 }, f.width * .025, f.height * .018, "rgba(246,132,175,.94)");
  line(ctx, [{ x: nose.x, y: nose.y + f.height * .025 }, { x: nose.x, y: nose.y + f.height * .075 }], "rgba(255,255,255,.8)", 1.5);
  const cheeks = [{ x: f.cx - f.width * .255, y: f.cy + f.height * .11 }, { x: f.cx + f.width * .255, y: f.cy + f.height * .11 }];
  cheeks.forEach(c => { ctx.save(); ctx.filter = `blur(${Math.max(5, f.width * .035)}px)`; ellipse(ctx, c, f.width * .10, f.height * .055, "rgba(255,95,155,.28)"); ctx.restore(); });
}

function drawGlasses(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, style: "dark" | "heart") {
  const f = getFaceGeometry(l, w, h), eyes = eyeCenters(l, w, h), a = headAngle(l, w, h);
  if (style === "heart") {
    const pulse = 1 + .06 * Math.sin(performance.now() / 180);
    eyes.forEach(e => { const s = f.width * .072 * pulse; polygon(ctx, [{ x: e.x, y: e.y + s * .95 }, { x: e.x - s * 1.35, y: e.y - s * .32 }, { x: e.x - s * .72, y: e.y - s * 1.05 }, { x: e.x, y: e.y - s * .36 }, { x: e.x + s * .72, y: e.y - s * 1.05 }, { x: e.x + s * 1.35, y: e.y - s * .32 }], "rgba(255,45,105,.86)", "rgba(255,255,255,.95)", 2); ellipse(ctx, { x: e.x - s * .35, y: e.y - s * .35 }, s * .16, s * .10, "rgba(255,255,255,.8)"); });
    return;
  }
  const [left, right] = eyes, eyeDistance = Math.hypot(right.x - left.x, right.y - left.y);
  if (!Number.isFinite(eyeDistance) || eyeDistance < 20) return;
  const lensW = eyeDistance * .49, lensH = Math.max(eyeDistance * .31, f.height * .075), rim = Math.max(2.5, eyeDistance * .018), bridge = eyeDistance * .10;
  const cx = (left.x + right.x) / 2, cy = (left.y + right.y) / 2, ca = Math.cos(a), sa = Math.sin(a);
  const local = (x: number, y: number): Point => ({ x: cx + x * ca - y * sa, y: cy + y * ca + x * sa });
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  line(ctx, [local(-eyeDistance * .20, -lensH * .04), local(-eyeDistance * .48, -lensH * .02), local(-f.width * .47, -f.height * .005)], "rgba(15,17,22,.98)", rim * 1.15);
  line(ctx, [local(eyeDistance * .20, -lensH * .04), local(eyeDistance * .48, -lensH * .02), local(f.width * .47, -f.height * .005)], "rgba(15,17,22,.98)", rim * 1.15);
  const drawLens = (eye: Point) => {
    ctx.save(); ctx.translate(eye.x, eye.y); ctx.rotate(a);
    const x = -lensW / 2, y = -lensH / 2, radius = Math.min(lensH * .28, lensW * .20);
    const g = ctx.createLinearGradient(0, y, 0, y + lensH); g.addColorStop(0, "rgba(25,32,48,.94)"); g.addColorStop(.5, "rgba(20,27,40,.80)"); g.addColorStop(1, "rgba(4,7,12,.96)");
    ctx.fillStyle = g; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 6;
    ctx.beginPath(); if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, lensW, lensH, radius); else ctx.ellipse(0, 0, lensW / 2, lensH / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(242,245,250,.98)"; ctx.lineWidth = rim; ctx.stroke();
    const reflection = ctx.createLinearGradient(x, y, x + lensW, y + lensH); reflection.addColorStop(0, "rgba(255,255,255,0)"); reflection.addColorStop(.48, "rgba(255,255,255,.04)"); reflection.addColorStop(.57, "rgba(255,255,255,.30)"); reflection.addColorStop(.70, "rgba(255,255,255,.02)"); reflection.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = reflection; ctx.beginPath(); if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, lensW, lensH, radius); else ctx.ellipse(0, 0, lensW / 2, lensH / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  drawLens(left); drawLens(right);
  line(ctx, [local(-bridge, -lensH * .02), local(0, lensH * .08), local(bridge, lensH * .02)], "rgba(242,245,250,.98)", rim * 1.05);
  ctx.restore();
}

function drawCrown(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), a = headAngle(l, w, h); ctx.save(); ctx.translate(f.cx, f.top - f.height * .08); ctx.rotate(a);
  const g = ctx.createLinearGradient(-f.width * .32, 0, f.width * .32, 0); g.addColorStop(0, "#f3b21b"); g.addColorStop(.5, "#ffe56b"); g.addColorStop(1, "#e7a400");
  polygon(ctx, [{ x: -f.width * .32, y: f.height * .11 }, { x: -f.width * .23, y: -f.height * .10 }, { x: -f.width * .09, y: f.height * .025 }, { x: 0, y: -f.height * .16 }, { x: f.width * .09, y: f.height * .025 }, { x: f.width * .23, y: -f.height * .10 }, { x: f.width * .32, y: f.height * .11 }], g, "rgba(255,255,255,.98)", 2);
  line(ctx, [{ x: -f.width * .32, y: f.height * .11 }, { x: f.width * .32, y: f.height * .11 }], "rgba(255,244,170,.98)", Math.max(3, f.width * .012));
  [-.23, 0, .23].forEach(x => ellipse(ctx, { x: f.width * x, y: x === 0 ? -f.height * .075 : -f.height * .035 }, f.width * .025, f.width * .025, "rgba(110,185,255,.95)", "white", 1));
  ctx.restore();
}

function drawMakeup(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number, strong = false) {
  const f = getFaceGeometry(l, w, h), eyes = eyeCenters(l, w, h), a = headAngle(l, w, h), power = strong ? .78 : .58;
  eyes.forEach(e => {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a);
    const g = ctx.createLinearGradient(0, -f.height * .065, 0, f.height * .055); g.addColorStop(0, `rgba(112,50,175,${power * .72})`); g.addColorStop(.55, `rgba(255,96,178,${power * .42})`); g.addColorStop(1, "rgba(255,120,180,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, f.width * .115, f.height * .058, 0, 0, Math.PI * 2); ctx.fill();
    line(ctx, [{ x: -f.width * .10, y: -f.height * .015 }, { x: -f.width * .035, y: -f.height * .035 }, { x: f.width * .04, y: -f.height * .025 }, { x: f.width * .11, y: 0 }], `rgba(30,15,35,${strong ? .95 : .82})`, Math.max(1.8, f.width * .006));
    ellipse(ctx, { x: 0, y: 0 }, f.width * .030, f.height * .017, "rgba(255,255,255,.28)"); ctx.restore();
  });
  const cheeks = [{ x: f.cx - f.width * .255, y: f.cy + f.height * .11 }, { x: f.cx + f.width * .255, y: f.cy + f.height * .11 }];
  cheeks.forEach(c => { ctx.save(); ctx.filter = `blur(${Math.max(5, f.width * .035)}px)`; ellipse(ctx, c, f.width * .115, f.height * .062, `rgba(255,65,122,${strong ? .34 : .25})`); ctx.restore(); });
  const lips = points(l, LM.outerLips, w, h); if (lips.length >= 3) { const g = ctx.createLinearGradient(f.cx, f.cy + f.height * .16, f.cx, f.cy + f.height * .27); g.addColorStop(0, `rgba(245,70,125,${strong ? .70 : .52})`); g.addColorStop(1, `rgba(185,25,80,${strong ? .58 : .42})`); polygon(ctx, lips, g, "rgba(255,255,255,.24)", 1); }
}

function drawFreckles(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), n = center(points(l, LM.nose, w, h));
  for (let i = -7; i <= 7; i++) for (let j = 0; j < 3; j++) {
    const x = n.x + i * f.width * .032 + (j - 1) * f.width * .008, y = n.y + f.height * (.075 + j * .038) + Math.abs(i) * f.height * .004;
    ellipse(ctx, { x, y }, f.width * .0065, f.width * .0065, `rgba(125,70,45,${.55 + (j % 2) * .10})`);
  }
}

function drawTears(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), t = performance.now() / 900;
  eyeCenters(l, w, h).forEach((e, i) => {
    const drift = Math.sin(t + i) * f.height * .008;
    const p = [{ x: e.x, y: e.y + f.height * .035 }, { x: e.x - f.width * .020, y: e.y + f.height * .15 + drift }, { x: e.x, y: e.y + f.height * .225 + drift }, { x: e.x + f.width * .020, y: e.y + f.height * .15 + drift }];
    polygon(ctx, p, "rgba(70,190,255,.72)", "rgba(235,250,255,.90)", 1.2); ellipse(ctx, { x: e.x - f.width * .006, y: e.y + f.height * .115 + drift }, f.width * .008, f.height * .020, "rgba(255,255,255,.82)");
  });
}

function drawNeon(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), oval = points(l, LM.faceOval, w, h); ctx.save(); ctx.shadowBlur = Math.max(10, f.width * .04); ctx.shadowColor = "rgba(55,230,255,.95)"; line(ctx, [...oval, oval[0]], "rgba(82,238,255,.90)", Math.max(2.5, f.width * .008)); ctx.restore();
  eyeCenters(l, w, h).forEach(e => { glow(ctx, () => ellipse(ctx, e, f.width * .060, f.height * .028, "rgba(50,255,210,.20)", "rgba(90,255,240,.98)", 2.2), 8); });
}

function drawEffectSparkles(ctx: CanvasRenderingContext2D, l: NormalizedLandmark[], w: number, h: number) {
  const f = getFaceGeometry(l, w, h), t = performance.now() / 400;
  const pts = [{ x: f.left + f.width * .10, y: f.top + f.height * .24 }, { x: f.right - f.width * .10, y: f.top + f.height * .28 }, { x: f.left + f.width * .18, y: f.cy + f.height * .18 }, { x: f.right - f.width * .18, y: f.cy + f.height * .14 }];
  pts.forEach((p, i) => { const s = f.width * (.016 + .014 * (.5 + .5 * Math.sin(t + i))); line(ctx, [{ x: p.x - s * 2.2, y: p.y }, { x: p.x + s * 2.2, y: p.y }], "rgba(255,248,190,.95)", 2); line(ctx, [{ x: p.x, y: p.y - s * 2.2 }, { x: p.x, y: p.y + s * 2.2 }], "rgba(255,255,255,.95)", 2); });
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
  } finally { ctx.restore(); }
}
