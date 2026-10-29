// World coordinates: Y up. Screen (CSS px): Y down. Zoom/pan never touch geometry.
export class Viewport {
  constructor(w = 800, h = 600) { this.w = w; this.h = h; this.cx = 0; this.cy = 0; this.scale = 1; }
  resize(w, h) { this.w = w; this.h = h; }
  toScreen(x, y) { return { x: (x - this.cx) * this.scale + this.w / 2, y: this.h / 2 - (y - this.cy) * this.scale }; }
  toWorld(sx, sy) { return { x: (sx - this.w / 2) / this.scale + this.cx, y: (this.h / 2 - sy) / this.scale + this.cy }; }
  panBy(dsx, dsy) { this.cx -= dsx / this.scale; this.cy += dsy / this.scale; }
  zoomAt(sx, sy, factor) {
    const before = this.toWorld(sx, sy);
    this.scale = Math.min(1e6, Math.max(1e-6, this.scale * factor));
    const after = this.toWorld(sx, sy);
    this.cx += before.x - after.x; this.cy += before.y - after.y;
  }
  fit(b, margin = 0.9) {
    const bw = Math.max(b.maxX - b.minX, 1e-9), bh = Math.max(b.maxY - b.minY, 1e-9);
    this.cx = (b.minX + b.maxX) / 2; this.cy = (b.minY + b.maxY) / 2;
    this.scale = Math.min(this.w / bw, this.h / bh) * margin;
  }
}
