const pool = new Map<string, HTMLCanvasElement>();

export function pooled(key: string, w: number, h: number): HTMLCanvasElement {
  let c = pool.get(key);
  if (!c) { c = document.createElement("canvas"); pool.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const x = c.getContext("2d")!;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = "source-over";
  x.globalAlpha = 1;
  x.clearRect(0, 0, w, h);
  return c;
}
