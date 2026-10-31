import { TAU, grips } from '../core/entity.js';
import { expand } from '../geometry/expand.js';
export function strokeEntity(ctx, vp, e) {
  const S = (x, y) => vp.toScreen(x, y); ctx.beginPath();
  if (e.type === 'line') { const a = S(e.x1, e.y1), b = S(e.x2, e.y2); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  else if (e.type === 'polyline') { e.pts.forEach(([x, y], i) => { const p = S(x, y); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); if (e.closed) ctx.closePath(); }
  else if (e.type === 'circle') { const c = S(e.cx, e.cy); ctx.arc(c.x, c.y, e.r * vp.scale, 0, TAU); }
  else if (e.type === 'arc') { const c = S(e.cx, e.cy); ctx.arc(c.x, c.y, e.r * vp.scale, -e.a0, -e.a1, true); } // Y flip => negate angles
  else if (e.type === 'point') { const p = S(e.x, e.y); ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y); ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x, p.y + 5); ctx.moveTo(p.x + 3, p.y); ctx.arc(p.x, p.y, 3, 0, TAU); }
  else if (e.type === 'xline' || e.type === 'ray') { const R = Math.hypot(vp.w, vp.h) / vp.scale + Math.hypot(e.x - vp.cx, e.y - vp.cy), c = Math.cos(e.a) * R, s = Math.sin(e.a) * R, x = e.type === 'xline';
    const a = S(x ? e.x - c : e.x, x ? e.y - s : e.y), b = S(e.x + c, e.y + s); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
}
export function drawTextAt(ctx, sx, sy, px, rot, str, center) {
  if (px < 2) return; ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rot); ctx.font = `${px}px Helvetica, Arial, sans-serif`; ctx.textAlign = center ? 'center' : 'left';
  str.split('\n').forEach((l, i) => ctx.fillText(l, 0, i * 1.4 * px)); ctx.restore();
}
export function drawEntity(ctx, vp, d, e) {
  const compound = e.type === 'dim' || e.type === 'insert', keep = ctx.strokeStyle;
  for (const p of compound ? expand(d, e) : [e]) {
    const own = compound && p.color && p.color !== 'BYLAYER' && keep !== '#f0b441'; ctx.strokeStyle = ctx.fillStyle = own ? p.color : keep;
    if (p.type === 'text') { const s = vp.toScreen(p.x, p.y); drawTextAt(ctx, s.x, s.y, p.h * vp.scale, p.rot, p.str, p.center); }
    else { strokeEntity(ctx, vp, p); if (p.fill) ctx.fill(); }
  }
  ctx.strokeStyle = ctx.fillStyle = keep;
}
export function drawGrips(ctx, vp, e) {
  ctx.fillStyle = '#f0b441';
  for (const [x, y] of grips(e)) { const p = vp.toScreen(x, y); ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
}
