import { drawGrid, drawAxes } from './grid.js';
import { strokeEntity, drawEntity, drawGrips } from './entities.js';
export class Renderer {
  constructor(canvas, vp) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.vp = vp; this.showGrid = true; }
  resize() {
    const r = this.canvas.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0); this.vp.resize(r.width, r.height);
  }
  render(drawing, sel = new Set(), preview = null, box = null, snap = null) {
    const { ctx, vp } = this;
    ctx.fillStyle = '#0e1a22'; ctx.fillRect(0, 0, vp.w, vp.h);
    if (this.showGrid) drawGrid(ctx, vp);
    drawAxes(ctx, vp);
    ctx.lineWidth = 1.5;
    const vis = drawing.entities.filter(e => drawing.isVisible(e));
    for (const e of vis) { const s = sel.has(e.id); ctx.strokeStyle = s ? '#f0b441' : drawing.colorOf(e); ctx.setLineDash(s ? [6, 3] : []); drawEntity(ctx, vp, drawing, e); }
    ctx.setLineDash([]);
    for (const e of vis) if (sel.has(e.id)) drawGrips(ctx, vp, e);
    if (preview) { ctx.strokeStyle = '#6fd3ff'; ctx.setLineDash([4, 4]); strokeEntity(ctx, vp, preview); ctx.setLineDash([]); }
    if (snap) { const p = vp.toScreen(snap.x, snap.y); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.strokeRect(p.x - 6, p.y - 6, 12, 12);
      ctx.fillStyle = '#ffe14d'; ctx.font = '11px system-ui'; ctx.fillText({ end: 'Endpoint', mid: 'Midpoint', cen: 'Center', int: 'Intersection', per: 'Perpendicular', nea: 'Nearest' }[snap.type], p.x + 10, p.y - 8); }
    if (box) { const x = Math.min(box.a.sx, box.b.sx), y = Math.min(box.a.sy, box.b.sy), w = Math.abs(box.b.sx - box.a.sx), h = Math.abs(box.b.sy - box.a.sy);
      ctx.fillStyle = box.crossing ? 'rgba(92,184,92,.15)' : 'rgba(111,211,255,.15)'; ctx.strokeStyle = box.crossing ? '#5cb85c' : '#6fd3ff';
      ctx.setLineDash(box.crossing ? [5, 4] : []); ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]); }
  }
}
