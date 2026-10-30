import { TAU } from '../core/entity.js';
import { drawTextAt } from './entities.js';
export function drawSheet(ctx, sheet, vp) {
  const S = (x, y) => vp.toScreen(x, y), k = vp.scale, a = S(0, sheet.H), b = S(sheet.W, 0);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineCap = 'round';
  for (const it of sheet.items) {
    ctx.save(); if (it.clip) { const c = sheet.clip, p = S(c.x, c.y + c.h), q = S(c.x + c.w, c.y); ctx.beginPath(); ctx.rect(p.x, p.y, q.x - p.x, q.y - p.y); ctx.clip(); }
    ctx.lineWidth = Math.max(0.6, (it.lw || 0.25) * k); ctx.beginPath();
    if (it.t === 'line') { const p = S(it.x1, it.y1), q = S(it.x2, it.y2); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    else if (it.t === 'poly') { it.pts.forEach((pt, i) => { const p = S(pt[0], pt[1]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); if (it.closed) ctx.closePath(); if (it.fill) ctx.fill(); ctx.stroke(); }
    else if (it.t === 'circle') { const p = S(it.cx, it.cy); ctx.arc(p.x, p.y, it.r * k, 0, TAU); ctx.stroke(); }
    else if (it.t === 'arc') { const p = S(it.cx, it.cy); ctx.arc(p.x, p.y, it.r * k, -it.a0, -it.a1, true); ctx.stroke(); }
    else if (it.t === 'text') { const p = S(it.x, it.y); drawTextAt(ctx, p.x, p.y, it.h * k, it.rot, it.str, it.center); }
    ctx.restore();
  }
}
