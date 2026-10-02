import { pooled } from "./canvasPool";

export const SUPPORTS_CTX_FILTER = (() => {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    const x = c.getContext("2d")!;
    x.filter = "grayscale(1)";
    x.fillStyle = "#f00";
    x.fillRect(0, 0, 2, 2);
    const d = x.getImageData(0, 0, 1, 1).data;
    return d[0] === d[1];
  } catch { return false; }
})();

function resample(src: HTMLCanvasElement, tw: number, th: number, key: string) {
  const c = pooled(key, tw, th);
  const x = c.getContext("2d")!;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(src, 0, 0, src.width, src.height, 0, 0, tw, th);
  return c;
}

export function blurInto(dst: CanvasRenderingContext2D, src: HTMLCanvasElement, radius: number, w: number, h: number, _kind?: string) {
  if (SUPPORTS_CTX_FILTER) {
    dst.filter = `blur(${radius.toFixed(1)}px)`;
    dst.drawImage(src, 0, 0);
    dst.filter = "none";
    return;
  }
  const f = Math.max(2, radius);
  const sw = Math.max(2, Math.round(w / f)), sh = Math.max(2, Math.round(h / f));
  let cur = src, i = 0, j = 0;
  while (cur.width / 2 > sw) cur = resample(cur, Math.round(cur.width / 2), Math.round(cur.height / 2), `bd${i++}`);
  cur = resample(cur, sw, sh, `bd${i++}`);
  while (cur.width * 2 < w) cur = resample(cur, cur.width * 2, cur.height * 2, `bu${j++}`);
  dst.imageSmoothingEnabled = true;
  dst.imageSmoothingQuality = "high";
  dst.drawImage(cur, 0, 0, cur.width, cur.height, 0, 0, w, h);
}
