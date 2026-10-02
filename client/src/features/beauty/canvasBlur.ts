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
  } catch {
    return false;
  }
})();

export function blurInto(
  dst: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  radius: number,
  w: number,
  h: number,
) {
  if (SUPPORTS_CTX_FILTER) {
    dst.filter = `blur(${radius.toFixed(1)}px)`;
    dst.drawImage(src, 0, 0);
    dst.filter = "none";
    return;
  }

  const k = Math.max(2, radius);
  const sw = Math.max(1, Math.round(w / k));
  const sh = Math.max(1, Math.round(h / k));
  const tmp = document.createElement("canvas");
  tmp.width = sw;
  tmp.height = sh;
  const t = tmp.getContext("2d")!;
  t.imageSmoothingQuality = "high";
  t.drawImage(src, 0, 0, sw, sh);
  dst.imageSmoothingEnabled = true;
  dst.imageSmoothingQuality = "high";
  dst.drawImage(tmp, 0, 0, sw, sh, 0, 0, w, h);
}
