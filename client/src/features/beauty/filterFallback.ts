import { blurInto } from "./canvasBlur";

const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mul = (a: number[], b: number[]) => [
  a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
  a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
  a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
];
const mulVec = (a: number[], v: number[]) => [
  a[0]*v[0]+a[1]*v[1]+a[2]*v[2],
  a[3]*v[0]+a[4]*v[1]+a[5]*v[2],
  a[6]*v[0]+a[7]*v[1]+a[8]*v[2],
];
const satMat = (s: number) => {
  const r = .213, g = .715, b = .072;
  return [r+(1-r)*s, g-g*s, b-b*s, r-r*s, g+(1-g)*s, b-b*s, r-r*s, g-g*s, b+(1-b)*s];
};

function opMat(name: string, v: number): { a: number[]; o: number[] } | null {
  switch (name) {
    case "brightness": return { a: [v,0,0,0,v,0,0,0,v], o: [0,0,0] };
    case "contrast": { const k = 128 * (1 - v); return { a: [v,0,0,0,v,0,0,0,v], o: [k,k,k] }; }
    case "saturate": return { a: satMat(v), o: [0,0,0] };
    case "grayscale": return { a: satMat(1 - clamp01(v)), o: [0,0,0] };
    case "sepia": {
      const t = clamp01(v), S = [.393,.769,.189,.349,.686,.168,.272,.534,.131];
      return { a: I.map((x, i) => x * (1 - t) + S[i] * t), o: [0,0,0] };
    }
    case "invert": {
      const t = clamp01(v), k = 1 - 2 * t, c = 255 * t;
      return { a: [k,0,0,0,k,0,0,0,k], o: [c,c,c] };
    }
    case "hue-rotate": {
      const r = v * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      return { a: [
        .213+c*.787-s*.213, .715-c*.715-s*.715, .072-c*.072+s*.928,
        .213-c*.213+s*.143, .715+c*.285+s*.140, .072-c*.072-s*.283,
        .213-c*.213-s*.787, .715-c*.715+s*.715, .072+c*.928+s*.072,
      ], o: [0,0,0] };
    }
    default: return null;
  }
}

let key = "", M = I, O = [0, 0, 0], BLUR = 0;
function build(css: string) {
  if (css === key) return;
  key = css;
  let m = I, o = [0, 0, 0], blur = 0;
  for (const mt of css.matchAll(/([a-z-]+)\(([^)]+)\)/g)) {
    const raw = mt[2].trim();
    const v = raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
    if (mt[1] === "blur") { blur = v; continue; }
    const op = opMat(mt[1], v);
    if (!op) continue;
    const no = mulVec(op.a, o);
    o = [no[0] + op.o[0], no[1] + op.o[1], no[2] + op.o[2]];
    m = mul(op.a, m);
  }
  M = m; O = o; BLUR = blur;
}

export function applyFilterFallback(ctx: CanvasRenderingContext2D, w: number, h: number, css: string) {
  build(css);
  if (BLUR >= 1) {
    const tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    tmp.getContext("2d")!.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, w, h);
    blurInto(ctx, tmp, BLUR, w, h);
  }
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    d[i]   = M[0]*r + M[1]*g + M[2]*b + O[0];
    d[i+1] = M[3]*r + M[4]*g + M[5]*b + O[1];
    d[i+2] = M[6]*r + M[7]*g + M[8]*b + O[2];
  }
  ctx.putImageData(img, 0, 0);
}
