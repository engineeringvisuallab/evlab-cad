import { TAU, grips } from '../core/entity.js';
import { resolveDim } from '../geometry/dimensions.js';
export function strokeEntity(ctx, vp, e) {
  const S = (x, y) => vp.toScreen(x, y); ctx.beginPath();
  if (e.type === 'line') { const a = S(e.x1, e.y1), b = S(e.x2, e.y2); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  else if (e.type === 'polyline') { e.pts.forEach(([x, y], i) => { const p = S(x, y); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); if (e.closed) ctx.closePath(); }
  else if (e.type === 'circle') { const c = S(e.cx, e.cy); ctx.arc(c.x, c.y, e.r * vp.scale, 0, TAU); }
  else if (e.type === 'arc') { const c = S(e.cx, e.cy); ctx.arc(c.x, c.y, e.r * vp.scale, -e.a0, -e.a1, true); } // Y flip => negate angles
  ctx.stroke();
}
export function drawEntity(ctx, vp, d, e) {
  if (e.type !== 'dim') return strokeEntity(ctx, vp, e);
  const g = resolveDim(d, e); if (!g) return; const st = d.dimStyle;
  g.lines.forEach(l => strokeEntity(ctx, vp, { type: 'line', x1: l[0], y1: l[1], x2: l[2], y2: l[3] }));
  ctx.fillStyle = ctx.strokeStyle; const k = st.arrow, w = 0.35;
  for (const a of g.arrows) { const P = (da) => vp.toScreen(a.x + k * Math.cos(a.a + da), a.y + k * Math.sin(a.a + da)), t = vp.toScreen(a.x, a.y), l = P(w), r = P(-w);
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.closePath(); ctx.fill(); }
  const tp = vp.toScreen(g.text.x - Math.sin(g.text.a) * st.text * 0.8, g.text.y + Math.cos(g.text.a) * st.text * 0.8);
  ctx.save(); ctx.translate(tp.x, tp.y); ctx.rotate(-g.text.a); ctx.font = `${Math.max(9, st.text * vp.scale)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(g.text.str, 0, 0); ctx.restore();
}
export function drawGrips(ctx, vp, e) {
  ctx.fillStyle = '#f0b441';
  for (const [x, y] of grips(e)) { const p = vp.toScreen(x, y); ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
}
