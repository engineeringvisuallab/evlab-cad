import { dist } from '../core/entity.js';
// Dimension values are always computed from geometry. Radius/diameter dims and line-referenced aligned dims follow their object (associative).
export function resolveDim(d, e) {
  const st = d.dimStyle, f = v => (v * st.scale).toFixed(st.precision);
  let lines, arrows, text;
  if (e.dtype === 'aligned' || e.dtype === 'linear') {
    let p1 = e.p1, p2 = e.p2;
    if (e.ref) { const r = d.get(e.ref); if (r?.type !== 'line') return null; p1 = [r.x1, r.y1]; p2 = [r.x2, r.y2]; }
    if (!p1 || !p2) return null;
    let a, b, val, ang;
    if (e.dtype === 'aligned') {
      const L = dist(p1[0], p1[1], p2[0], p2[1]); if (L < 1e-9) return null;
      const ux = (p2[0] - p1[0]) / L, uy = (p2[1] - p1[1]) / L, h = (e.o[0] - p1[0]) * -uy + (e.o[1] - p1[1]) * ux;
      a = [p1[0] - uy * h, p1[1] + ux * h]; b = [p2[0] - uy * h, p2[1] + ux * h]; val = L; ang = Math.atan2(uy, ux);
    } else if (Math.abs(e.o[1] - (p1[1] + p2[1]) / 2) >= Math.abs(e.o[0] - (p1[0] + p2[0]) / 2)) { a = [p1[0], e.o[1]]; b = [p2[0], e.o[1]]; val = Math.abs(p2[0] - p1[0]); ang = 0; }
    else { a = [e.o[0], p1[1]]; b = [e.o[0], p2[1]]; val = Math.abs(p2[1] - p1[1]); ang = Math.PI / 2; }
    if (val < 1e-9) return null;
    if (Math.cos(ang) < -1e-9) ang += Math.PI;
    const g = Math.atan2(b[1] - a[1], b[0] - a[0]);
    lines = [[...p1, ...a], [...p2, ...b], [...a, ...b]]; arrows = [{ x: a[0], y: a[1], a: g }, { x: b[0], y: b[1], a: g + Math.PI }];
    text = { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: ang, str: f(val) };
  } else {
    const r = d.get(e.ref); if (!r || (r.type !== 'circle' && r.type !== 'arc')) return null;
    const t = Math.atan2(e.o[1] - r.cy, e.o[0] - r.cx), P = [r.cx + r.r * Math.cos(t), r.cy + r.r * Math.sin(t)], Q = [r.cx - r.r * Math.cos(t), r.cy - r.r * Math.sin(t)];
    if (e.dtype === 'radius') { lines = [[r.cx, r.cy, ...P]]; arrows = [{ x: P[0], y: P[1], a: t + Math.PI }]; text = { x: (r.cx + P[0]) / 2, y: (r.cy + P[1]) / 2, a: t, str: 'R' + f(r.r) }; }
    else { lines = [[...Q, ...P]]; arrows = [{ x: P[0], y: P[1], a: t + Math.PI }, { x: Q[0], y: Q[1], a: t }]; text = { x: r.cx, y: r.cy, a: t, str: '⌀' + f(2 * r.r) }; }
    if (Math.cos(text.a) < -1e-9) text.a += Math.PI;
  }
  return { lines, arrows, text };
}
