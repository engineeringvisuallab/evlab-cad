import { TAU, grips } from '../core/entity.js';
export function strokeEntity(ctx, vp, e) {
  const S = (x, y) => vp.toScreen(x, y); ctx.beginPath();
  if (e.type === 'line') { const a = S(e.x1, e.y1), b = S(e.x2, e.y2); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  else if (e.type === 'polyline') { e.pts.forEach(([x, y], i) => { const p = S(x, y); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); if (e.closed) ctx.closePath(); }
  else if (e.type === 'circle') { const c = S(e.cx, e.cy); ctx.arc(c.x, c.y, e.r * vp.scale, 0, TAU); }
  else if (e.type === 'arc') { const c = S(e.cx, e.cy); ctx.arc(c.x, c.y, e.r * vp.scale, -e.a0, -e.a1, true); } // Y flip => negate angles
  ctx.stroke();
}
export function drawGrips(ctx, vp, e) {
  ctx.fillStyle = '#f0b441';
  for (const [x, y] of grips(e)) { const p = vp.toScreen(x, y); ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
}
